import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class SetOfficeHoursDto {
    @ApiProperty({ example: 1, description: '0 = Sunday, 6 = Saturday' })
    @IsInt()
    dayOfWeek: number;

    @ApiProperty({ example: '09:00' })
    @IsString()
    openTime: string;

    @ApiProperty({ example: '17:00' })
    @IsString()
    closeTime: string;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    isClosed?: boolean;
}
