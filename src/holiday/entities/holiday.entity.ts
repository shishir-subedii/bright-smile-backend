import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
@Entity('holidays')
export class Holiday {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'varchar', nullable: true })
    reason: string | null;

    @Column({ type: 'boolean', default: false })
    isRecurring: boolean; // e.g. every year on this date (like Dashain/Tihar)

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}