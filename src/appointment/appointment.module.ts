import { forwardRef, Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { PaymentModule } from 'src/payment/payment.module';
import { MailQueueModule } from 'src/common/mail/queue/mail.queue.module';
import { AppointmentQueueModule } from './queue/appointment.queue.module';
import { QueuesModule } from 'src/common/queue/queue.module';

@Module({
  imports: [
    forwardRef(() => PaymentModule),
    MailQueueModule,
    AppointmentQueueModule,
    QueuesModule
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService]
})
export class AppointmentModule {}
