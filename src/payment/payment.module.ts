import { forwardRef, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeController } from './stripe/stripe.controller';
import { StripeService } from './stripe/stripe.service';
import { eSewaController } from './esewa/esewa.controller';
import { eSewaService } from './esewa/esewa.service';
import { AppointmentModule } from 'src/appointment/appointment.module';

@Module({
  imports: [
    forwardRef(()=>AppointmentModule)
  ],
  controllers: [StripeController, eSewaController],
  providers: [StripeService, eSewaService],
  exports: [StripeService],
})
export class PaymentModule {}
