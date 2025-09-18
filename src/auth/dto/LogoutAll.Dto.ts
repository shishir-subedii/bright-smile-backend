import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LogOutAllDto {
    @ApiProperty({ example: 'mypassword' })
    @IsString()
    password: string
}