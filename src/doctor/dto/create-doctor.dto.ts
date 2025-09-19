import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { IdType } from '../entities/doctor.entity';

export class CreateDoctorDto {
    @ApiProperty({ description: 'Doctor name', example: 'Dr. Aayush Sharma' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'Specialization', required: false, example: 'Orthodontist' })
    @IsOptional()
    @IsString()
    specialization?: string;

    @ApiProperty({ description: 'ID Type', enum: IdType, example: IdType.LICENSE })
    @IsNotEmpty()
    @IsEnum(IdType)
    idType: IdType;

    @ApiProperty({ description: 'ID Number', example: 'LIC123456' })
    @IsNotEmpty()
    @IsString()
    idNumber: string;
}
