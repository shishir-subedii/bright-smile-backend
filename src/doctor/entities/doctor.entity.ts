import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Appointment } from 'src/appointment/entities/appointment.entity';
import { MAX_DOCTOR_DAILY_APPOINTMENTS } from 'src/common/constants/constants';

export enum IdType {
    LICENSE = 'LICENSE',
    CITIZENSHIP = 'CITIZENSHIP',
    PASSPORT = 'PASSPORT',
}

@Entity('doctors')
export class Doctor {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'varchar', nullable: true })
    specialization: string | null;

    @Column({ type: 'enum', enum: IdType })
    idType: IdType;

    @Column({ type: 'varchar', unique: true })
    idNumber: string;

    @OneToMany(() => Appointment, (appointment) => appointment.doctor)
    appointments: Appointment[];

    @Column({ type: 'int', default: MAX_DOCTOR_DAILY_APPOINTMENTS })
    maxAppointmentsPerDay: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
