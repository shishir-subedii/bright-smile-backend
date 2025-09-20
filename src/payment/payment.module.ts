import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeController } from './stripe/stripe.controller';
import { StripeService } from './stripe/stripe.service';

@Module({
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentModule {}
