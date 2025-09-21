// src/appointment/appointment.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { User } from 'src/user/entity/user.entity';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import { Currency, Payment, PaymentMethod, PaymentStatus } from 'src/payment/entities/payment.entity';
import { APPOINTMENT_FEE, APPOINTMENT_FEE_NPR } from 'src/common/constants/appointment-fee';

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
  ) { }

  // Create appointment
  async create(userId: string, dto: CreateAppointmentDto): Promise<Appointment> {
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

}