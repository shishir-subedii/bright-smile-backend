import { forwardRef, Module } from '@nestjs/common';
import { StripeController } from './stripe/stripe.controller';
import { StripeService } from './stripe/stripe.service';
import { eSewaController } from './esewa/esewa.controller';
import { eSewaService } from './esewa/esewa.service';
import { AppointmentModule } from 'src/appointment/appointment.module';

//TODO: Add refund system if possible for both esewa and stripe

@Module({
  imports: [
    forwardRef(()=>AppointmentModule)
  ],
  controllers: [StripeController, eSewaController],
  providers: [StripeService, eSewaService],
  exports: [StripeService],
})
export class PaymentModule {}
