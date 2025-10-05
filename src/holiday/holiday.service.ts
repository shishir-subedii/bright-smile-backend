import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Holiday } from './entities/holiday.entity';
import { OfficeHours } from './entities/office_hours.entity';
import { DoctorAbsence } from './entities/doctor_absenses.entity';
import { Doctor } from 'src/doctor/entities/doctor.entity';
import doc from 'pdfkit';
import { Appointment, AppointmentStatus } from 'src/appointment/entities/appointment.entity';


@Injectable()
export class HolidayService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidayRepo: Repository<Holiday>,

    @InjectRepository(OfficeHours)
    private readonly officeHoursRepo: Repository<OfficeHours>,

    @InjectRepository(DoctorAbsence)
    private readonly absenceRepo: Repository<DoctorAbsence>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
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

    // Lunch break
    if (time >= '14:00' && time <= '14:30') {
      throw new ForbiddenException('Clinic closed for lunch break (2:00 PM - 2:30 PM)');
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

    // --- Slot calculation helper ---
    const getSlotWindow = (time: string): { slotStart: string; slotEnd: string } => {
      const [hour, minute] = time.split(':').map(Number);

      // Round down to nearest 15 min slot
      const slotMinute = Math.floor(minute / 15) * 15;
      const slotStart = `${hour.toString().padStart(2, '0')}:${slotMinute
        .toString()
        .padStart(2, '0')}`;

      // Add 15 minutes safely
      let endHour = hour;
      let endMinute = slotMinute + 15;
      if (endMinute >= 60) {
        endHour += 1;
        endMinute -= 60;
      }
      const slotEnd = `${endHour.toString().padStart(2, '0')}:${endMinute
        .toString()
        .padStart(2, '0')}`;

      return { slotStart, slotEnd };
    };

    const { slotStart, slotEnd } = getSlotWindow(time);

    // 4. Check if slot already booked
    const slotCount = await this.appointmentRepo.count({
      where: {
        doctor: { id: doctorId },
        status: AppointmentStatus.BOOKED,
        date,
        time: Between(slotStart, slotEnd),
      },
    });

    if (slotCount >= 1) {
      throw new ForbiddenException(
        `This 15-minute slot (${slotStart} - ${slotEnd}) is already booked`,
      );
    }

    return true;
  }


  // Find available doctor(s)
  async getAvailableDoctors(date: string, time: string): Promise<Doctor[]> {
    // 1. Holidays
    const holiday = await this.isHoliday(date);
    if (holiday) return [];

    // 2. Office hours
    const dayOfWeek = new Date(date).getDay();
    const officeHours = await this.officeHoursRepo.findOne({ where: { dayOfWeek } });
    if (!officeHours || officeHours.isClosed) return [];

    if (time < officeHours.openTime || time > officeHours.closeTime) return [];

    // 2.5 Lunch break (14:00 - 14:30)
    if (time >= '14:00' && time <= '14:30') return [];

    // 3. Check each doctor
    const doctors = await this.doctorRepo.find();
    const available: Doctor[] = [];

    for (const doctor of doctors) {
      let unavailable = false;

      // 3.1 Doctor absences
      const absences = await this.getDoctorAbsences(doctor.id, date);
      for (const absence of absences) {
        if (absence.isAbsent && !absence.isHalfDay) unavailable = true;
        if (absence.isHalfDay && absence.fromTime && absence.toTime) {
          if (time >= absence.fromTime && time <= absence.toTime) unavailable = true;
        }
      }

      // 3.2 Daily patient cap (30)
      const dailyCount = await this.appointmentRepo.count({
        where: { doctor: { id: doctor.id }, date },
      });
      if (dailyCount >= 30) unavailable = true;

      // 3.3 Slot cap (1 per 15-min interval)
      const [hour, minute] = time.split(':').map(Number);
      const slotMinute = Math.floor(minute / 15) * 15;
      const slotStart = `${hour.toString().padStart(2, '0')}:${slotMinute
        .toString()
        .padStart(2, '0')}`;
      const slotEndMinute = slotMinute + 15;
      const slotEnd = `${hour.toString().padStart(2, '0')}:${slotEndMinute
        .toString()
        .padStart(2, '0')}`;

      const slotCount = await this.appointmentRepo.count({
        where: {
          doctor: { id: doctor.id },
          date,
          time: Between(slotStart, slotEnd),
        },
      });
      if (slotCount >= 1) unavailable = true;

      // ✅ Only add doctor if still available
      if (!unavailable) available.push(doctor);
    }

    return available;
  }


  // Add absence for all doctors (loop through each doctor)
  async addAbsenceForAll(date: string, fromTime?: string, toTime?: string, reason?: string) {
    // 1. Fetch all doctors
    const doctors = await this.doctorRepo.find();

    // 2. Loop and create absence for each
    const absences = doctors.map((doctor) =>
      this.absenceRepo.create({
        doctorId: doctor.id,
        date,
        fromTime: fromTime ?? null,
        toTime: toTime ?? null,
        reason,
        isAbsent: true,
        isHalfDay: !!(fromTime && toTime),
      }),
    );

    // 3. Save all absences at once
    return this.absenceRepo.save(absences);
  }

  async getAvailableDoctorsTime(date: string): Promise<
    { doctor: Doctor; availableSlots: string[] }[]
  > {
    const result: { doctor: Doctor; availableSlots: string[] }[] = [];

    // 1. Check holiday
    const holiday = await this.isHoliday(date);
    if (holiday) return []; // nobody available

    // 2. Office hours
    const dayOfWeek = new Date(date).getDay();
    const officeHours = await this.officeHoursRepo.findOne({ where: { dayOfWeek } });
    if (!officeHours || officeHours.isClosed) return [];

    // Generate all 15-min slots between open and close
    const slots: string[] = [];
    let [hour, minute] = officeHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = officeHours.closeTime.split(':').map(Number);

    while (hour < closeHour || (hour === closeHour && minute < closeMinute)) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      minute += 15;
      if (minute >= 60) {
        hour++;
        minute -= 60;
      }
    }

    // 3. Loop through all doctors
    const doctors = await this.doctorRepo.find();

    for (const doctor of doctors) {
      const availableSlots: string[] = [];

      // 3.1 Check doctor daily cap
      const dailyCount = await this.appointmentRepo.count({
        where: { doctor: { id: doctor.id }, date },
      });
      if (dailyCount >= 30) {
        result.push({ doctor, availableSlots: [] });
        continue; // no slots left at all
      }

      // 3.2 Get absences
      const absences = await this.getDoctorAbsences(doctor.id, date);

      // 3.3 Filter slots
      for (const slot of slots) {
        let unavailable = false;

        // Lunch break (14:00 - 14:30)
        if (slot >= '14:00' && slot <= '14:30') {
          unavailable = true;
        }

        // Absences
        for (const absence of absences) {
          if (absence.isAbsent && !absence.isHalfDay) unavailable = true;
          if (absence.isHalfDay && absence.fromTime && absence.toTime) {
            if (slot >= absence.fromTime && slot <= absence.toTime) unavailable = true;
          }
        }

        // Slot already booked?
        const [sHour, sMinute] = slot.split(':').map(Number);
        let endHour = sHour;
        let endMinute = sMinute + 15;
        if (endMinute >= 60) {
          endHour++;
          endMinute -= 60;
        }

        const slotEnd = `${endHour.toString().padStart(2, '0')}:${endMinute
          .toString()
          .padStart(2, '0')}`;

        const slotCount = await this.appointmentRepo.count({
          where: {
            doctor: { id: doctor.id },
            date,
            time: Between(slot, slotEnd),
          },
        });
        if (slotCount >= 1) unavailable = true;

        if (!unavailable) availableSlots.push(slot);
      }
      result.push({ doctor, availableSlots });
    }

    return result;
  }

}
