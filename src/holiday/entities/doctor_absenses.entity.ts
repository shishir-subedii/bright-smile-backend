import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('doctor_absences')
export class DoctorAbsence {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    doctorId: string;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'time', nullable: true })
    fromTime: string | null; // optional (partial absence)

    @Column({ type: 'time', nullable: true })
    toTime: string | null; // optional

    @Column({ type: 'boolean', default: true })
    isAbsent: boolean;

    @Column({ type: 'boolean', default: false })
    isHalfDay: boolean;

    @Column({ type: 'varchar', nullable: true })
    reason: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
