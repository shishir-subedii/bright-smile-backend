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
import { Payment, PaymentStatus, PaymentMethod, Currency } from 'src/payment/entities/payment.entity';
import { APPOINTMENT_FEE } from 'src/common/constants/appointment';

export enum AppointmentStatus {
    PENDING = 'PENDING',
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

    @Column({type: 'varchar', nullable: true})
    fileUrl: string | null;

    @Column({
        type: 'enum',
        enum: AppointmentStatus,
        default: AppointmentStatus.PENDING,
    })
    status: AppointmentStatus;

    @Column({
        type: 'enum',
        enum: Currency,
        default: Currency.USD,
    })
    currency: Currency;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    paymentStatus: PaymentStatus;

    @Column({ type: 'int', default: APPOINTMENT_FEE})
    price: number;

    @Column({
        type: 'enum',
        enum: PaymentMethod,
        default: PaymentMethod.CASH,
    })
    paymentMethod: PaymentMethod;
    
    @OneToOne(() => Payment, (payment) => payment.appointment, { nullable: true })
    payment: Payment | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
