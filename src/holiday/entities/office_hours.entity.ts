import { Column, UpdateDateColumn, CreateDateColumn, Entity, PrimaryGeneratedColumn, } from "typeorm";

@Entity('office_hours')
export class OfficeHours {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int' }) // 0 = Sunday, 6 = Saturday
    dayOfWeek: number;

    @Column({ type: 'time' })
    openTime: string; // e.g. "10:00"

    @Column({ type: 'time' })
    closeTime: string; // e.g. "18:00"

    @Column({ type: 'boolean', default: false })
    isClosed: boolean; // for Saturday

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
