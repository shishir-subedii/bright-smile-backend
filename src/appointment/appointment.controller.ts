// src/appointment/appointment.controller.ts
import {
  Body,
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  Get,
  Query,
  Patch,
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
import { AppointmentStatus } from './entities/appointment.entity';

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

  //mark appointment as completed
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch('complete/:id')
  @ApiOperation({ summary: 'Mark appointment as completed (Admin only)' })

  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async markAsCompleted(@Param('id') id: string, @Req() req) {
    const appointment = await this.appointmentService.markAsCompleted(id);
    return {
      success: true,
      message: 'Appointment marked as completed successfully',
      data: appointment,
    };
  }
  
  //mark appointment as cancelled
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch('cancel/:id')
  @ApiOperation({ summary: 'Mark appointment as cancelled (Admin only)' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })

  async markAsCancelled(@Param('id') id: string, @Req() req) {
    const appointment = await this.appointmentService.cancelAppointment(id);
    return {
      success: true,
      message: 'Appointment marked as cancelled successfully',
      data: appointment,
    };
  }

  //find appointments for a specific doctor with pagination
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get appointments for a specific doctor (Admin only)' })
  @ApiParam({ name: 'doctorId', description: 'Doctor ID' })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2023-10-15', description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getAppointmentsForDoctor(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
    @Pagination() pagination: PaginationParams,
    @Req() req,
  ) {
    const result = await this.appointmentService.getAppointmentsForDoctor(doctorId, date, pagination.page, pagination.limit);
    const { appointments, total } = result;
    const paginatedData = paginateResponse(appointments, total, pagination.page, pagination.limit, req);
    return {
      success: true,
      message: 'Appointments for doctor fetched successfully',
      data: paginatedData,
    };
  }


  //find specific types of appointments(eg cancelled, booked, etc) with pagination
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('status/:status')
  @ApiOperation({ summary: 'Get appointments by status (Admin only)' })
  @ApiParam({ name: 'status', description: 'Appointment Status', enum: AppointmentStatus })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getAppointmentsByStatus(
    @Param('status') status: AppointmentStatus,
    @Pagination() pagination: PaginationParams,
    @Req() req,
  ) {
    const result = await this.appointmentService.getAppointmentsByStatus(status, pagination.page, pagination.limit);
    const { appointments, total } = result;
    const paginatedData = paginateResponse(appointments, total, pagination.page, pagination.limit, req);
    return {
      success: true,
      message: `Appointments with status ${status} fetched successfully`,
      data: paginatedData,
    };
  }


  //find today's appointments with pagination
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('today')
  @ApiOperation({ summary: "Get today's appointments (Admin only)" })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getTodaysAppointments(
    @Pagination() pagination: PaginationParams,
    @Req() req,
  ) {
    const result = await this.appointmentService.getTodaysAppointments(pagination.page, pagination.limit);
    const { appointments, total } = result;
    const paginatedData = paginateResponse(appointments, total, pagination.page, pagination.limit, req);
    return {
      success: true,
      message: "Today's appointments fetched successfully",
      data: paginatedData,
    };
  }
}
