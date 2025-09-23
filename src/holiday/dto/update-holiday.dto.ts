import { PartialType } from '@nestjs/swagger';
import { CreateHolidayDto } from './holiday.dto';

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}
