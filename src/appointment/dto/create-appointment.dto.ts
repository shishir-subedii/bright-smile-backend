// src/appointment/dto/create-appointment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { Gender } from '../entities/appointment.entity';
import { PaymentMethod } from 'src/payment/entities/payment.entity';

export class CreateAppointmentDto {
  @ApiProperty({ example: '2025-09-20' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  time: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  age: number;

  @ApiProperty({ example: PaymentMethod.CASH, enum: PaymentMethod})
  @IsEnum(PaymentMethod)
  pay: PaymentMethod;

  @ApiProperty({ example: 'MALE', enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: '+9779812345678' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '81851f67-41f1-4213-bda4-5d8755c1c381' })
  @IsString()
  doctorId: string;
}
