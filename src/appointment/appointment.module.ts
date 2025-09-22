import { forwardRef, Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { PaymentModule } from 'src/payment/payment.module';
import { MailQueueModule } from 'src/common/mail/queue/mail.queue.module';

@Module({
  imports: [
    forwardRef(() => PaymentModule),
    MailQueueModule
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService]
})
export class AppointmentModule {}
