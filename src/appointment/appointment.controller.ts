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
import { paginateResponse } from 'src/common/pagination/pagination.helper';
import { Roles } from 'src/common/auth/AuthRoles';
import { UserRole } from 'src/common/enums/auth-roles.enum';

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
    const { data, total } = appointments;
    const paginatedData = paginateResponse(data, total, pagination.page, pagination.limit, req);
    return {
      success: true,
      message: 'User appointments fetched successfully',
      data: paginatedData,
    };
  }

  //findOne appointment by id for user
  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async getAppointmentById(@Param('id') id: string, @Req() req) {
    const appointment = await this.appointmentService.getAppointmentById(req.user.id, id);
    return {
      success: true,
      message: 'Appointment fetched successfully',
      data: appointment,
    };
  }

  //For admins and superadmin
  //find all appointments with pagination
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('all/admin')
  @ApiOperation({ summary: 'Get all appointments (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getAllAppointments(@Pagination() pagination: PaginationParams, @Req() req) {
    const appointments = await this.appointmentService.getAllAppointments(pagination.page, pagination.limit);
    const { data, total } = appointments;
    const paginatedData = paginateResponse(data, total, pagination.page, pagination.limit, req);
    return {
      success: true,
      message: 'All appointments fetched successfully',
      data: paginatedData,
    };
  }

  //findOne by id for admin
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Get appointment by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async getAppointmentByIdAdmin(@Param('id') id: string, @Req() req) {
    const appointment = await this.appointmentService.getAppointmentByIdAdmin(id);
    return {
      success: true,
      message: 'Appointment fetched successfully',
      data: appointment,
    };
  }
  

}
