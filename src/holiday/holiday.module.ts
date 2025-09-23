import { Module } from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { HolidayController } from './holiday.controller';

@Module({
  controllers: [HolidayController],
  providers: [HolidayService],
})
export class HolidayModule {}
