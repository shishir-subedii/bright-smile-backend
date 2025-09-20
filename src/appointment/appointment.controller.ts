// src/appointment/appointment.controller.ts
import {
  Body,
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { StripeService } from 'src/payment/stripe/stripe.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from 'src/common/auth/AuthGuard';
import { Pagination, PaginationParams } from 'src/common/pagination/pagination.decorator';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
  ) { }

  /**
   * Step 1: Create appointment
   */
  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  @ApiBody({ type: CreateAppointmentDto })
  async create(@Body() dto: CreateAppointmentDto, @Req() req) {
    const appointment = await this.appointmentService.create(req.user.id, dto);
    return {
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
    };
  }

  //find your appointments
  @Get()
  @ApiOperation({ summary: 'Get user appointments' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getUserAppointments(@Pagination() pagination: PaginationParams, @Req() req) {
    const appointments = await this.appointmentService.getUserAppointments(req.user.id, pagination.page, pagination.limit);
    return {
      success: true,
      message: 'User appointments fetched successfully',
      data: appointments,
    };
  }

}
