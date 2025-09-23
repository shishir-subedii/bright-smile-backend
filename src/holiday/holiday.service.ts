import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday } from './entities/holiday.entity';
import { OfficeHours } from './entities/office_hours.entity';
import { DoctorAbsence } from './entities/doctor_absenses.entity';


@Injectable()
export class HolidayService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,

    @InjectRepository(OfficeHours)
    private readonly officeHoursRepo: Repository<OfficeHours>,

    @InjectRepository(DoctorAbsence)
    private readonly absenceRepo: Repository<DoctorAbsence>,
  ) { }

  // -------------------
  // Holiday methods
  // -------------------
  async addHoliday(date: string, reason?: string, isRecurring = false) {
    const holiday = this.holidayRepo.create({ date, reason, isRecurring });
    return this.holidayRepo.save(holiday);
  }

  async removeHoliday(id: string) {
    const holiday = await this.holidayRepo.findOne({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    await this.holidayRepo.delete(id);
    return { message: 'Holiday removed' };
  }

  async getHolidays() {
    return this.holidayRepo.find();
  }

  async isHoliday(date: string): Promise<Holiday | null> {
    // direct match
    const holiday = await this.holidayRepo.findOne({ where: { date } });
    if (holiday) return holiday;

    // recurring check (e.g. every Jan 1)
    const [year, month, day] = date.split('-').map(Number);
    return this.holidayRepo.findOne({
      where: { isRecurring: true, date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` },
    });
  }

  // -------------------
  // Office hours methods
  // -------------------
  async setOfficeHours(dayOfWeek: number, openTime: string, closeTime: string, isClosed = false) {
    let hours = await this.officeHoursRepo.findOne({ where: { dayOfWeek } });
    if (!hours) {
      hours = this.officeHoursRepo.create({ dayOfWeek, openTime, closeTime, isClosed });
    } else {
      hours.openTime = openTime;
      hours.closeTime = closeTime;
      hours.isClosed = isClosed;
    }
    return this.officeHoursRepo.save(hours);
  }

  async getOfficeHours() {
    return this.officeHoursRepo.find({ order: { dayOfWeek: 'ASC' } });
  }

  // -------------------
  // Doctor absence methods
  // -------------------
  async addDoctorAbsence(doctorId: string, date: string, fromTime?: string, toTime?: string, reason?: string) {
    const absence = this.absenceRepo.create({
      doctorId,
      date,
      fromTime: fromTime ?? null,
      toTime: toTime ?? null,
      reason,
      isAbsent: true,
      isHalfDay: !!(fromTime && toTime),
    });
    return this.absenceRepo.save(absence);
  }

  async removeDoctorAbsence(id: string) {
    const absence = await this.absenceRepo.findOne({ where: { id } });
    if (!absence) throw new NotFoundException('Absence not found');
    await this.absenceRepo.delete(id);
    return { message: 'Absence removed' };
  }

  async getDoctorAbsences(doctorId: string, date: string) {
    return this.absenceRepo.find({ where: { doctorId, date } });
  }

  // -------------------
  // Reusable validation
  // -------------------
  async validateAppointment(doctorId: string, date: string, time: string) {
    // 1. Holidays
    const holiday = await this.isHoliday(date);
    if (holiday) {
      throw new ForbiddenException(`Clinic closed on ${date} (${holiday.reason})`);
    }

    // 2. Office hours
    const dayOfWeek = new Date(date).getDay();
    const officeHours = await this.officeHoursRepo.findOne({ where: { dayOfWeek } });
    if (!officeHours || officeHours.isClosed) {
      throw new ForbiddenException('Clinic closed on this day');
    }
    if (time < officeHours.openTime || time > officeHours.closeTime) {
      throw new ForbiddenException(
        `Clinic is open only between ${officeHours.openTime} - ${officeHours.closeTime}`,
      );
    }

    // 3. Doctor absences
    const absences = await this.getDoctorAbsences(doctorId, date);
    for (const absence of absences) {
      if (absence.isAbsent && !absence.isHalfDay) {
        throw new ForbiddenException('Doctor is absent on this day');
      }
      if (absence.isHalfDay && absence.fromTime && absence.toTime) {
        if (time >= absence.fromTime && time <= absence.toTime) {
          throw new ForbiddenException('Doctor unavailable during this time');
        }
      }
    }

    return true;
  }
}
