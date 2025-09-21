import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeController } from './stripe/stripe.controller';
import { StripeService } from './stripe/stripe.service';
import { eSewaController } from './esewa/esewa.controller';
import { eSewaService } from './esewa/esewa.service';

@Module({
  controllers: [StripeController, eSewaController],
  providers: [StripeService, eSewaService],
  exports: [StripeService],
})
export class PaymentModule {}
