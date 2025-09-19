// src/user/entity/user.entity.ts
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { UserRole } from 'src/common/enums/auth-roles.enum';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { Appointment } from 'src/appointment/entities/appointment.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @Column({ type: 'varchar', nullable: true })
    name: string | null;

    @Column({ type: 'varchar', select: false, nullable: true })
    password: string | null;

    @Column({
        type: 'text',
        array: true,
        nullable: true,
        select: false,
        default: () => 'ARRAY[]::TEXT[]',
    })
    accessTokens: string[] | null;

    @Column({ type: 'boolean', default: false })
    isVerified: boolean;

    @Column({ type: 'varchar', nullable: true })
    otp: string | null;

    @Column({ type: 'timestamptz', nullable: true })
    otpExpiry: Date | null;

    // 👇 Add Google ID for OAuth users
    @Column({ type: 'varchar', nullable: true, unique: true })
    googleId: string | null;

    @Column({type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL})
    authProvider: AuthProvider;

    @OneToMany(() => Appointment, (appointment) => appointment.user, {nullable: true})
    appointments: Appointment[] | null;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
