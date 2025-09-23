import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from 'src/appointment/entities/appointment.entity';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import { DoctorAbsence } from 'src/holiday/entities/doctor_absenses.entity';
import { Holiday } from 'src/holiday/entities/holiday.entity';
import { OfficeHours } from 'src/holiday/entities/office_hours.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { User } from 'src/user/entity/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            Appointment,
            Doctor,
            Payment,
            Holiday,
            OfficeHours,
            DoctorAbsence
        ]),
    ],
    exports: [TypeOrmModule], // Export so other modules can inject repositories
})
export class PersistenceModule { }
