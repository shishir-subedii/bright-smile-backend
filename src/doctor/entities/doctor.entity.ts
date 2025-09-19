import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Appointment } from 'src/appointment/entities/appointment.entity';

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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
