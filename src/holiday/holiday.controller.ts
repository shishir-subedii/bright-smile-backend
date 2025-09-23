import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HolidayService } from './holiday.service';
import { CreateHolidayDto } from './dto/holiday.dto';
import { CreateDoctorAbsenceDto } from './dto/doctor-absence.dto';
import { SetOfficeHoursDto } from './dto/office-hours.dto';

@ApiTags('Holidays & Availability')
@Controller('availability')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) { }

  // -------------------
  // Holiday endpoints
  // -------------------
  @Post('holidays')
  @ApiOperation({ summary: 'Add a new holiday' })
  addHoliday(@Body() dto: CreateHolidayDto) {
    return this.holidayService.addHoliday(dto.date, dto.reason, dto.isRecurring ?? false);
  }

  @Delete('holidays/:id')
  @ApiOperation({ summary: 'Remove a holiday' })
  removeHoliday(@Param('id') id: string) {
    return this.holidayService.removeHoliday(id);
  }

  @Get('holidays')
  @ApiOperation({ summary: 'Get all holidays' })
  getHolidays() {
    return this.holidayService.getHolidays();
  }

  // -------------------
  // Office hours endpoints
  // -------------------
  @Post('office-hours')
  @ApiOperation({ summary: 'Set office hours for a day' })
  setOfficeHours(@Body() dto: SetOfficeHoursDto) {
    return this.holidayService.setOfficeHours(dto.dayOfWeek, dto.openTime, dto.closeTime, dto.isClosed ?? false);
  }

  @Get('office-hours')
  @ApiOperation({ summary: 'Get office hours' })
  getOfficeHours() {
    return this.holidayService.getOfficeHours();
  }

  // -------------------
  // Doctor absences endpoints
  // -------------------
  @Post('doctor-absences')
  @ApiOperation({ summary: 'Add doctor absence' })
  addDoctorAbsence(@Body() dto: CreateDoctorAbsenceDto) {
    return this.holidayService.addDoctorAbsence(dto.doctorId, dto.date, dto.fromTime, dto.toTime, dto.reason);
  }

  @Delete('doctor-absences/:id')
  @ApiOperation({ summary: 'Remove doctor absence' })
  removeDoctorAbsence(@Param('id') id: string) {
    return this.holidayService.removeDoctorAbsence(id);
  }

  @Get('doctor-absences/:doctorId/:date')
  @ApiOperation({ summary: 'Get doctor absences for a date' })
  getDoctorAbsences(@Param('doctorId') doctorId: string, @Param('date') date: string) {
    return this.holidayService.getDoctorAbsences(doctorId, date);
  }
}
