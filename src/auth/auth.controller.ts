import { BadRequestException, Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse, ApiBadRequestResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UserRegisterDto } from './dto/UserRegisterDto';
import { UserLoginDto } from './dto/UserLoginDto';
import { JwtAuthGuard } from 'src/common/auth/AuthGuard';
import { changePasswordDto } from './dto/ChangePasswordDto';
import { VerifyOtpDto } from './dto/VerifyOtp.dto';
import { userPayloadType } from 'src/common/types/auth.types';
import { LogOutAllDto } from './dto/LogoutAll.Dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /*
  Register new user
  */

  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({
    status: 201,
    description: 'New user created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Password and Confirm Password donot match',
  })
  @ApiBadRequestResponse({
    description: 'Email is already in use',
  })
  @ApiBody({
    type: UserRegisterDto,
  })
  @Post('register')
  async register(@Body() userData: UserRegisterDto) {
    const user = await this.authService.register(userData);
    return {
      success: true,
      message: user.message ? user.message : 'Registration successful. Please check your email for verification.',
      data: user,
    };
  }

  /*
  Login user 
  */
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
  })
  @ApiBadRequestResponse({
    description: 'User not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid password',
  })
  @ApiBody({
    type: UserLoginDto,
  })
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginData: UserLoginDto) {
    const responseData = await this.authService.login(loginData);
    return {
      // success: true,
      message: 'Login successful',
      data: responseData
    };
  }

  //verify signup OTP
  @ApiOperation({ summary: 'Verify signup OTP' })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid OTP',
  })
  @ApiBody({
    type: VerifyOtpDto,
  })
  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const isValid = await this.authService.verifySignupOtp(verifyOtpDto.token, verifyOtpDto.otp);
    if (!isValid) {
      throw new BadRequestException('Invalid OTP');
    }
    return {
      // success: true,
      message: 'OTP verified successfully',
    };
  }

  /*
  Logout
  */
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
  })
  @ApiBearerAuth()
  @ApiBadRequestResponse({
    description: 'User not found',
  })
  @Get('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    const user = req['user'] as { email: string };
    const token = req.headers['authorization']?.split(' ')[1]; // Extract Bearer token

    if (!token) {
      return {
        success: false,
        message: 'Authorization token not found',
      };
    }

    await this.authService.logout(user.email, token);

    return {
      // success: true,
      message: 'User logged out successfully',
    };
  }

  /*
  Logout from all sessions 
  Take password in body and token in header
  */
  @Patch('logout-all')
  @ApiOperation({ summary: 'Logout user from all sessions' })
  @ApiBearerAuth()
  @ApiBadRequestResponse({
    description: 'User not found',
  })
  @ApiBody({
    type: LogOutAllDto,
  })
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Req() req: Request, @Body() body: LogOutAllDto) {
    const user = req['user'] as userPayloadType;
    await this.authService.logoutAllSessions(user.email, body.password);
    return {
      success: true,
      message: 'User logged out from all sessions successfully',
    };
  }

  /*
  Change user password
  */
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'User password changed successfully',
  })
  @ApiBearerAuth()
  @ApiBadRequestResponse({
    description: 'User not found',
  })
  @ApiBadRequestResponse({
    description: 'Old password is incorrect',
  })
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req: Request, @Body() body: changePasswordDto) {
    const user = req['user'] as userPayloadType;
    const updatedUser = await this.authService.changePassword(user.email, body);
    return {
      // success: true,
      message: 'Password changed successfully',
      data: updatedUser,
    };
  }

}

