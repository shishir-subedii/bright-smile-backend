import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDoctorAbsenceDto {
    @ApiProperty({ example: 'doctor-uuid-123' })
    @IsString()
    doctorId: string;

    @ApiProperty({ example: '2025-09-25' })
    @IsDateString()
    date: string;

    @ApiProperty({ example: '10:00', required: false })
    @IsOptional()
    @IsString()
    fromTime?: string;

    @ApiProperty({ example: '14:00', required: false })
    @IsOptional()
    @IsString()
    toTime?: string;

    @ApiProperty({ example: 'Medical conference', required: false })
    @IsOptional()
    @IsString()
    reason?: string;
}
