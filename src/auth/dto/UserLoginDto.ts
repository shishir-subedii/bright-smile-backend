import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class UserLoginDto {

    @ApiProperty({ example: 'shishirsubedi116@gmail.com' })
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @ApiProperty({ example: 'securePassword123' })
    @IsString()
    @MinLength(6, {message: 'Password must be at least 6 characters long'})
    password: string;
}

//Remaining data we will update later