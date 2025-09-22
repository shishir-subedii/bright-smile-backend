import { forwardRef, Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [
    forwardRef(() => PaymentModule)
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService]
})
export class AppointmentModule {}
