import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateHolidayDto {
    @ApiProperty({ example: '2025-10-20' })
    @IsDateString()
    date: string;

    @ApiProperty({ example: 'Dashain Festival', required: false })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isRecurring?: boolean;
}
