import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { Appointment } from 'src/appointment/entities/appointment.entity';

export enum PaymentMethod {
    ESEWA = 'ESEWA',
    STRIPE = 'STRIPE',
    CASH = 'CASH'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    PAID = 'PAID',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
}

export enum Currency{
    USD = 'USD',
    NPR = 'NPR',
}

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: PaymentMethod })
    method: PaymentMethod;

    @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
    status: PaymentStatus;

    @Column({ type: 'int' })
    amount: number;

    @Column({ type: 'varchar', nullable: true })
    transactionId: string | null; // from Stripe/eSewa, null for CASH

    @Column({ type: 'varchar', nullable: true })
    sessionId: string | null; // Stripe session ID or eSewa reference ID, null for CASH

    @Column({ type: 'varchar', nullable: true })
    checkoutUrl: string | null; // for redirecting to Stripe checkout esewa checkout, null for others

    @OneToOne(() => Appointment, (appointment) => appointment.payment, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'appointment_id' }) // Payment owns FK
    appointment: Appointment;


    @Column({ type: 'enum', enum: Currency, default: Currency.USD })
    currency: Currency;

    @Column({ type: 'varchar', nullable: true })
    eSewaSignature: string | null; // eSewa signature for verification
    
    @Column({ type: 'varchar', nullable: true })
    transactionCode: string | null; // eSewa signature for verification

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
