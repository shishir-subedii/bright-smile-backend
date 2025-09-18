import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class VerifyOtpDto {
    @ApiProperty({ example: 'mytoken1232435' })
    @IsString()
    token: string

    @ApiProperty({ example: '123456' })
    @IsString()
    otp: string;
}