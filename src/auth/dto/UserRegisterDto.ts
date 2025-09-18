import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
export class UserRegisterDto {

    @ApiProperty({example: 'Bob'})
    @IsString()
    name: string;

    @ApiProperty({ example: 'shishirsubedi116@gmail.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'securePassword123' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'securePassword123' })
    @IsString()
    confirmPassword: string;
}

//Remaining data we will update later