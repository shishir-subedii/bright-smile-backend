import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { IdType } from '../entities/doctor.entity';
import { MAX_DOCTOR_DAILY_APPOINTMENTS } from 'src/common/constants/constants';

export class CreateDoctorDto {
    @ApiProperty({ description: 'Doctor name', example: 'Dr. Aayush Sharma' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'Specialization', required: false, example: 'Orthodontist' })
    @IsOptional()
    @IsString()
    specialization?: string;

    @ApiProperty({ description: 'Maximum appointments per day', example: 10, default: MAX_DOCTOR_DAILY_APPOINTMENTS })
    @IsOptional()
    @IsNotEmpty()
    maxAppointmentsPerDay: number;

    @ApiProperty({ description: 'ID Type', enum: IdType, example: IdType.LICENSE })
    @IsNotEmpty()
    @IsEnum(IdType)
    idType: IdType;

    @ApiProperty({ description: 'ID Number', example: 'LIC123456' })
    @IsNotEmpty()
    @IsString()
    idNumber: string;
}
