import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HolidayService } from './holiday.service';
import { CreateHolidayDto } from './dto/holiday.dto';
import { CreateDoctorAbsenceDto } from './dto/doctor-absence.dto';
import { SetOfficeHoursDto } from './dto/office-hours.dto';
import { JwtAuthGuard } from 'src/common/auth/AuthGuard';
import { UserRole } from 'src/common/enums/auth-roles.enum';
import { Roles } from 'src/common/auth/AuthRoles';

@ApiTags('Holidays & Availability')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('availability')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) { }

  // -------------------
  // Holiday endpoints
  // -------------------
  @Post('holidays')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Add a new holiday' })
  async addHoliday(@Body() dto: CreateHolidayDto) {
    const data = await this.holidayService.addHoliday(dto.date, dto.reason, dto.isRecurring ?? false);
    return { success: true, message: 'Holiday added successfully', data };
  }

  @Delete('holidays/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Remove a holiday' })
  async removeHoliday(@Param('id') id: string) {
    const data = await this.holidayService.removeHoliday(id);
    return { success: true, message: 'Holiday removed successfully', data };
  }

  @Get('holidays')
  @ApiOperation({ summary: 'Get all holidays' })
  async getHolidays() {
    const data = await this.holidayService.getHolidays();
    return { success: true, message: 'Holidays retrieved successfully', data };
  }

  // -------------------
  // Office hours endpoints
  // -------------------
  @Post('office-hours')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Set office hours for a day' })
  async setOfficeHours(@Body() dto: SetOfficeHoursDto) {
    const data = await this.holidayService.setOfficeHours(dto.dayOfWeek, dto.openTime, dto.closeTime, dto.isClosed ?? false);
    return { success: true, message: 'Office hours updated successfully', data };
  }

  @Get('office-hours')
  @ApiOperation({ summary: 'Get office hours' })
  async getOfficeHours() {
    const data = await this.holidayService.getOfficeHours();
    return { success: true, message: 'Office hours retrieved successfully', data };
  }

  // -------------------
  // Doctor absences endpoints
  // -------------------
  @Post('doctor-absences')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Add doctor absence' })
  async addDoctorAbsence(@Body() dto: CreateDoctorAbsenceDto) {
    const data = await this.holidayService.addDoctorAbsence(dto.doctorId, dto.date, dto.fromTime, dto.toTime, dto.reason);
    return { success: true, message: 'Doctor absence added successfully', data };
  }

  @Delete('doctor-absences/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Remove doctor absence' })
  async removeDoctorAbsence(@Param('id') id: string) {
    const data = await this.holidayService.removeDoctorAbsence(id);
    return { success: true, message: 'Doctor absence removed successfully', data };
  }

  @Get('doctor-absences/:doctorId/:date')
  @ApiOperation({ summary: 'Get doctor absences for a date' })
  async getDoctorAbsences(@Param('doctorId') doctorId: string, @Param('date') date: string) {
    const data = await this.holidayService.getDoctorAbsences(doctorId, date);
    return { success: true, message: 'Doctor absences retrieved successfully', data };
  }

  @Get('doctors/:date/:time')
  @ApiOperation({ summary: 'Find available doctors at given date and time' })
  async getAvailableDoctors(
    @Param('date') date: string,
    @Param('time') time: string,
  ) {
    const data = await this.holidayService.getAvailableDoctors(date, time);
    return { success: true, message: 'Available doctors retrieved', data };
  }

  // -------------------
  // Apply absence to all doctors
  // -------------------
  @Post('doctor-absences/apply-to-all')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Apply absence to all doctors (clinic-wide absence)' })
  async addAbsenceForAll(
    @Body() dto: { date: string; fromTime?: string; toTime?: string; reason?: string },
  ) {
    const data = await this.holidayService.addAbsenceForAll(
      dto.date,
      dto.fromTime,
      dto.toTime,
      dto.reason,
    );
    return { success: true, message: 'Clinic-wide absence applied to all doctors', data };
  }
}
