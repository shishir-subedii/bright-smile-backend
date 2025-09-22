// src/appointment/appointment.service.ts
import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { User } from 'src/user/entity/user.entity';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import { Currency, Payment, PaymentMethod, PaymentStatus } from 'src/payment/entities/payment.entity';
import { APPOINTMENT_EXPIRY_MINUTES, APPOINTMENT_FEE, APPOINTMENT_FEE_NPR, MAX_DOCTOR_DAILY_APPOINTMENTS, MAX_USER_DAILY_APPOINTMENTS, PAYMENT_EXPIRY_MINUTES } from 'src/common/constants/constants';
import * as fs from 'fs';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import { MailService } from 'src/common/mail/mail.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { isProd } from 'src/common/utils/checkMode';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Doctor)
    private doctorRepo: Repository<Doctor>,

    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,

    @InjectQueue('mail-queue') private readonly mailQueue: Queue,
    @InjectQueue('appointment-queue') private readonly appointmentQueue: Queue,

    private readonly mailService: MailService
  ) { }


  private async checkUserDailyLimit(userId: string, date: string): Promise<void> {
    // Count existing *booked or pending* appointments for the user on the given date
    const userAppointmentCount = await this.appointmentRepo.count({
      where: {
        user: { id: userId },
        date: date,
        // Consider only statuses that represent an active booking
        status: Between(AppointmentStatus.PENDING, AppointmentStatus.BOOKED),
      },
    });
    const max_limit = isProd() ? MAX_USER_DAILY_APPOINTMENTS : 10; // Relax limit in non-prod environments
    if (userAppointmentCount >= max_limit) {
      throw new ForbiddenException(
        `User has already booked the maximum limit of ${max_limit} appointments for ${date}.`
      );
    }
  }

  // --- New Helper Method for Doctor Daily Capacity ---
  private async checkDoctorDailyCapacity(doctorId: string, date: string): Promise<void> {
    // Count existing *booked* appointments for the doctor on the given date
    const doctorAppointmentCount = await this.appointmentRepo.count({
      where: {
        doctor: { id: doctorId },
        date: date,
        // Only count BOOKED and PENDING appointments against the limit
        status: Between(AppointmentStatus.PENDING, AppointmentStatus.BOOKED),
      },
    });

    const findDoctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!findDoctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctorAppointmentCount >= findDoctor.maxAppointmentsPerDay) {
      throw new ForbiddenException(
        `Doctor is fully booked with ${findDoctor.maxAppointmentsPerDay} appointments on ${date}.`
      );
    }
  }

  private checkBookingDateLimit(date: string): void {
    const today = new Date();
    // Set to start of the day for clean comparison
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);

    // Appointment date must be today or later
    if (bookingDate < today) {
      throw new BadRequestException('Appointment date cannot be in the past.');
    }

    // Appointment date must be within the next 7 days (inclusive of the 7th day)
    if (bookingDate > oneWeekFromNow) {
      throw new ForbiddenException(`Appointments can only be booked up to 7 days in advance. Requested date: ${date}`);
    }
  }

  async cancelIfPending(appointmentId: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: ['payment'],
    });

    if (appointment && appointment.status === AppointmentStatus.PENDING) {
      appointment.status = AppointmentStatus.CANCELLED;
      appointment.paymentStatus = PaymentStatus.FAILED;
      if (appointment.payment) {
        console.log(`Cancelling payment ${appointment.payment.id} for appointment ${appointmentId}`);
        appointment.payment.status = PaymentStatus.FAILED;
        appointment.payment.checkoutUrl = null;
        appointment.payment.transactionId = null;
        appointment.payment.sessionId = null;

        await this.paymentRepo.save(appointment.payment);
      }
      await this.appointmentRepo.save(appointment);
      console.log(`Appointment ${appointmentId} auto-cancelled`);
    }
  }

  async findOneAppointment(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: ['payment', 'doctor', 'user'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async findOnePayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['appointment', 'appointment.user', 'appointment.doctor'],
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  // Create appointment
  async create(userId: string, dto: CreateAppointmentDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (dto.age < 0) {
      throw new NotFoundException('Age cannot be negative');
    }

    this.checkBookingDateLimit(dto.date);

    // Daily User Booking Limit Check ---
    await this.checkUserDailyLimit(userId, dto.date);

    // 2. Daily Doctor Booking Limit Check (Capacity) ---
    await this.checkDoctorDailyCapacity(dto.doctorId, dto.date);

    const appointment = this.appointmentRepo.create({
      user,
      doctor,
      date: dto.date,
      time: dto.time,
      age: dto.age,
      gender: dto.gender,
      price: APPOINTMENT_FEE,
      paymentMethod: dto.pay,
      phoneNumber: dto.phoneNumber,
      status: dto.pay === PaymentMethod.CASH ? AppointmentStatus.BOOKED : AppointmentStatus.PENDING,
      paymentStatus: dto.pay === PaymentMethod.CASH ? PaymentStatus.PAID : PaymentStatus.PENDING,
    });

    if (dto.pay === PaymentMethod.CASH) {
      const payment = this.paymentRepo.create({
        amount: APPOINTMENT_FEE,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
        appointment,
      });
      await this.paymentRepo.save(payment);
      appointment.payment = payment;
      await this.appointmentRepo.save(appointment);
      return await this.generateAndSendAppointmentConfirmation(user.id, appointment.id)
    }

    if (dto.pay === PaymentMethod.ESEWA) {
      appointment.paymentMethod = PaymentMethod.ESEWA;
      appointment.paymentStatus = PaymentStatus.PENDING;
      appointment.currency = Currency.NPR;
      appointment.price = APPOINTMENT_FEE_NPR;
      const payment = this.paymentRepo.create({
        amount: APPOINTMENT_FEE_NPR,
        currency: Currency.NPR,
        method: PaymentMethod.ESEWA,
        status: PaymentStatus.PENDING,
        appointment,
      });
      await this.paymentRepo.save(payment);
      appointment.payment = payment;
    }

    if(dto.pay === PaymentMethod.STRIPE){
      appointment.paymentMethod = PaymentMethod.STRIPE;
      appointment.paymentStatus = PaymentStatus.PENDING;
      const payment = this.paymentRepo.create({
        amount: APPOINTMENT_FEE,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        appointment,
      });
      await this.paymentRepo.save(payment);
      appointment.payment = payment;
    }

    const savedAppointment = await this.appointmentRepo.save(appointment);

    const appointmentWithPayment = await this.appointmentRepo.findOne({
      where: { id: savedAppointment.id },
      relations: ['payment', 'doctor', 'user'],
    });
    await this.appointmentQueue.add(
      'cancel-appointment',
      { appointmentId: savedAppointment.id },
      { delay: APPOINTMENT_EXPIRY_MINUTES * 60 * 1000 } 
    );

    return appointmentWithPayment;
  }

  async getUserAppointments(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<{ data: Appointment[]; total: number; page: number; limit: number }> {

    // Validate user existence
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Calculate offset
    const skip = (page - 1) * limit;

    // Fetch appointments with pagination and sorting
    const [appointments, total] = await this.appointmentRepo.findAndCount({
      where: { user: { id: userId } }, // nested object filter
      relations: ['payment', 'doctor', 'user'], // add doctor if you want
      order: { createdAt: 'DESC' }, // latest first
      skip,
      take: limit,
    });

    return {
      data: appointments,
      total,
      page,
      limit,
    };
  }

  //find specific types of appointments(eg cancelled, booked, etc) with pagination for user
  async getUserAppointmentsByStatus(userId: string, status: AppointmentStatus, page = 1, limit = 10): Promise<{ appointments: Appointment[]; total: number; page: number; limit: number }> {
    // Validate user existence
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    // Calculate offset
    const skip = (page - 1) * limit;
    // Fetch appointments with pagination and sorting
    const [appointments, total] = await this.appointmentRepo.findAndCount({
      where: { user: { id: userId }, status }, // nested object filter
      relations: ['payment', 'doctor'], // add doctor if you want
      order: { createdAt: 'DESC' }, // latest first
      skip,
      take: limit,
    });
    return {
      appointments,
      total,
      page,
      limit,
    };
  }


  //for user
  async getAppointmentById(userId: string, appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId, user: { id: userId } },
      relations: ['payment', 'doctor', 'user'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  //for admins and superadmin
  async getAllAppointments(
    page = 1,
    limit = 10
  ): Promise<{ data: Appointment[]; total: number; page: number; limit: number }> {
    // Calculate offset
    const skip = (page - 1) * limit;
    // Fetch appointments with pagination and sorting
    const [appointments, total] = await this.appointmentRepo.findAndCount({
      relations: ['payment', 'doctor', 'user'],
      order: { createdAt: 'DESC' }, // latest first
      skip,
      take: limit,
    });
    return {
      data: appointments,
      total,
      page,
      limit,
    };
  }

  //findone by id for admin
  async getAppointmentByIdAdmin(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: ['payment', 'doctor', 'user'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  //mark appointment as completed
  async markAsCompleted(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: ['payment', 'doctor', 'user'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    appointment.status = AppointmentStatus.COMPLETED;
    appointment.payment!.status = PaymentStatus.PAID;
    // const findPayment = await this.paymentRepo.findOne({ where: { appointment: { id: appointmentId } } });
    // if (findPayment) {
    //   findPayment.status = PaymentStatus.PAID;
    //   await this.paymentRepo.save(findPayment);
    //   appointment.paymentStatus = PaymentStatus.PAID;
    // }
    return await this.appointmentRepo.save(appointment);
  }

  //cancel appointment
  async cancelAppointment(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: ['payment', 'doctor', 'user'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    appointment.status = AppointmentStatus.CANCELLED;
    return await this.appointmentRepo.save(appointment);
  }

  //find specific appointment for a doctor with pagination
  async getAppointmentsForDoctor(doctorId: string, date: string, page: number=1, limit: number=10): Promise<{ appointments: Appointment[]; total: number, page: number, limit: number }> {
    const [appointments, total] = await this.appointmentRepo.findAndCount({
      where: { doctor: { id: doctorId }, date, status: AppointmentStatus.BOOKED },
      relations: ['user', 'payment'],
      //latest first
      order: { date: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { appointments, total, page, limit };
  }

  //find specific types of appointments(eg cancelled, booked, etc) with pagination
  async getAppointmentsByStatus(status: AppointmentStatus, page: number=1, limit: number=10): Promise<{ appointments: Appointment[]; total: number; page: number; limit: number }> {
    const [appointments, total] = await this.appointmentRepo.findAndCount({
      where: { status },
      relations: ['user', 'doctor', 'payment'],
      order: { date: 'DESC', time: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { appointments, total, page, limit };
  }

  //find today's appointments with pagination
  async getTodaysAppointments(page: number=1, limit: number=10): Promise<{ appointments: Appointment[]; total: number; page: number; limit: number }> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const [appointments, total] = await this.appointmentRepo.findAndCount({
      where: { date: dateStr, status: AppointmentStatus.BOOKED },
      relations: ['user', 'doctor', 'payment'],
      order: { time: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { appointments, total, page, limit };
  }

  //Generate PDF confirmation for appointment
  async generateAppointmentConfirmation(
    userId: string,
    appointmentId: string,
  ): Promise<{ fileUrl: string, fileName: string, userName: string, userEmail: string }> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId, user: { id: userId } },
      relations: ['user', 'doctor', 'payment'],
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'appointments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Unique file name
    const fileName = `appointment-${appointment.id}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 50 });

    // Pipe to file
    doc.pipe(fs.createWriteStream(filePath));

    // ---------- HEADER ----------
    doc
      .fontSize(22)
      .fillColor('#2C3E50')
      .text('BrightSmile Dental Clinic', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .fillColor('#555')
      .text('Appointment Confirmation', { align: 'center' })
      .moveDown(1);

    // Divider
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#3498db')
      .stroke()
      .moveDown(1);

    // ---------- Appointment Details ----------
    doc.fontSize(14).fillColor('#000').text(`Appointment ID: ${appointment.id}`);
    doc.text(`Appointment Date: ${appointment.date}`);
    doc.text(`Appointment Time: ${appointment.time}`);
    doc.text(`Status: ${appointment.status}`);
    doc.text(`Booked At: ${appointment.createdAt.toDateString()} at ${appointment.createdAt.toTimeString().split(' ')[0]} UTC`);
    doc.moveDown();

    // ---------- Patient Details ----------
    doc
      .fontSize(14)
      .fillColor('#2C3E50')
      .text('Patient Details', { underline: true })
      .moveDown(0.3);
    doc.fillColor('#000').text(`Name: ${appointment.user.name ?? 'N/A'}`);
    doc.text(`Email: ${appointment.user.email}`);
    doc.text(`Phone: ${appointment.phoneNumber}`);
    doc.text(`Age/Gender: ${appointment.age} / ${appointment.gender}`);
    doc.moveDown();

    // ---------- Doctor Details ----------
    doc
      .fontSize(14)
      .fillColor('#2C3E50')
      .text('Doctor Details', { underline: true })
      .moveDown(0.3);
    if (appointment.doctor) {
      doc
        .fillColor('#000')
        .text(
          `Name: ${appointment.doctor.name.startsWith('Dr.')
            ? appointment.doctor.name
            : 'Dr. ' + appointment.doctor.name
          }`,
        );
      if ((appointment.doctor as any).specialization) {
        doc.text(`Specialization: ${(appointment.doctor as any).specialization}`);
      }
    } else {
      doc.fillColor('#000').text('Doctor: Not Assigned');
    }
    doc.moveDown();

    // ---------- Payment Details ----------
    doc
      .fontSize(14)
      .fillColor('#2C3E50')
      .text('Payment Details', { underline: true })
      .moveDown(0.3);
    doc.fillColor('#000').text(`Method: ${appointment.paymentMethod}`);
    doc.text(`Status: ${appointment.payment?.status}`);
    doc.text(`Amount: ${appointment.price} ${appointment.currency}`);
    if (appointment.payment?.transactionId) {
      doc.text(`Transaction ID: ${appointment.payment.transactionId}`);
    }
    doc.moveDown();

    // ---------- Footer ----------
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#ccc')
      .stroke()
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor('#555')
      .text(
        'Please bring this confirmation with you on the appointment day.\n\nFor rescheduling or cancellation, contact us at support@brightsmile.com\n\nThis is just a demo appointment confirmation and not a real medical document.',
        { align: 'center' },
      );

    doc
      .moveDown(1)
      .fontSize(10)
      .fillColor('#aaa')
      .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    // Finalize
    doc.end();

    // Build public URL (served via express static)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    const fileUrl = `${backendUrl}/uploads/appointments/${fileName}`;

    //save to db
    appointment.fileUrl = fileUrl;
    await this.appointmentRepo.save(appointment);

    return { fileUrl, fileName, userName: appointment.user.name!, userEmail: appointment.user.email! };
  }

  async generateAndSendAppointmentConfirmation(userId: string, appointmentId: string) {
    const { fileUrl, fileName, userName, userEmail } =
      await this.generateAppointmentConfirmation(userId, appointmentId);

    // Add a job to the queue
    await this.mailQueue.add('send-confirmation-email', {
      userEmail,
      userName,
      fileName,
      fileUrl,
    });

    // You can return a response immediately, email is handled asynchronously
    return { message: 'Appointment confirmation is being sent.' };
  }

}
    