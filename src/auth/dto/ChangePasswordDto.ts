import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class changePasswordDto {
    @ApiProperty({ example: 'securePassword123' })
    @IsString()
    oldPassword: string;

    @ApiProperty({ example: 'newPassword123' })
    @IsString()
    newPassword: string;

    @ApiProperty({ example: 'newPassword123' })
    @IsString()
    confirmNewPassword: string;
}