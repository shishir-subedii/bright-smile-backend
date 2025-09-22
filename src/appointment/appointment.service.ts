// src/appointment/appointment.service.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { User } from 'src/user/entity/user.entity';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import { Currency, Payment, PaymentMethod, PaymentStatus } from 'src/payment/entities/payment.entity';
import { APPOINTMENT_FEE, APPOINTMENT_FEE_NPR } from 'src/common/constants/appointment-fee';
import * as fs from 'fs';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import { MailService } from 'src/common/mail/mail.service';

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

    private readonly mailService: MailService
  ) { }

  //TODO: Add transaction management here and don't let one user book more than 3 times in a day
  // Create appointment
  async create(userId: string, dto: CreateAppointmentDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (dto.age < 0) {
      throw new NotFoundException('Age cannot be negative');
    }

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
      // await this.appointmentRepo.save(appointment);
      // return await this.generateAndSendAppointmentConfirmation(user.id, appointment.id)
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

    return await this.appointmentRepo.save(appointment);
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
      relations: ['payment', 'doctor'], // add doctor if you want
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
    doc.text(`Date: ${appointment.date}`);
    doc.text(`Time: ${appointment.time}`);
    doc.text(`Status: ${appointment.status}`);
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
    doc.text(`Status: ${appointment.paymentStatus}`);
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
    try{
    const {fileUrl, fileName, userName, userEmail} = await this.generateAppointmentConfirmation(userId, appointmentId);
     await this.mailService.sendAppointmentConfirmation(userEmail, userName, fileName, fileUrl)
    }catch(err){
      throw new InternalServerErrorException("Internal Server Error")
    }
  }
}
    