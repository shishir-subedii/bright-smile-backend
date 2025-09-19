import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import { Payment, PaymentStatus, PaymentMethod } from 'src/payment/entities/payment.entity';

export enum AppointmentStatus {
    BOOKED = 'BOOKED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED',
}

export enum Gender{
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER',
}

@Entity('appointments')
export class Appointment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // relation: appointment belongs to a user
    @ManyToOne(() => User, (user) => user.appointments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    // relation: appointment is with a doctor
    @ManyToOne(() => Doctor, (doctor) => doctor.appointments, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'doctor_id' })
    doctor: Doctor | null;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'time' })
    time: string;

    //age, gender
    @Column({ type: 'int' })
    age: number;

    @Column({ type: 'enum', enum: Gender })
    gender: Gender;

    @Column({ type: 'varchar' })
    phoneNumber: string;

    @Column({
        type: 'enum',
        enum: AppointmentStatus,
        default: AppointmentStatus.BOOKED,
    })
    status: AppointmentStatus;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    paymentStatus: PaymentStatus;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.COD,
    })
    paymentMethod: PaymentMethod;

    // relation: appointment has a payment
    @OneToOne(() => Payment, (payment) => payment.appointment, { nullable: true })
    @JoinColumn({ name: 'payment_id' })
    payment: Payment | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
