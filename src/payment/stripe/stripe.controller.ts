import {
    Controller,
    Post,
    Param,
    Req,
    Body,
    Headers,
    BadRequestException,
    Get,
    Query,
    HttpCode,
    UseInterceptors,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Res,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

@ApiTags('Stripe Payments')
@Controller('payments/stripe')
export class StripeController {
    constructor(private readonly stripeService: StripeService) { }

    @Post('checkout/:appointmentId')
    async checkout(@Param('appointmentId') appointmentId: string) {
        const session = await this.stripeService.createCheckoutSession(appointmentId);
        return {
            success: true,
            message: 'Stripe checkout session created',
            data: { paymentUrl: session.url },
        };
    }

    @Post('webhook')
    @UseInterceptors(new class implements NestInterceptor {
        intercept(context: ExecutionContext, next: CallHandler) {
            return next.handle(); // skip global interceptor
        }
    })
    @HttpCode(200)
    async webhook(
        @Req() req: Request,
        @Res() res: Response,
        @Headers('stripe-signature') sig: string,
    ) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

        let event: Stripe.Event;
        try {
            // Cast as unknown first to satisfy TS
            event = stripe.webhooks.constructEvent(req.body as unknown as Buffer, sig, process.env.STRIPE_WEBHOOK_SECRET!);
        } catch (err: any) {
            console.log('Webhook signature verification failed', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        await this.stripeService.handleWebhook(event);

        return res.json({ received: true });
    }



    // src/payment/stripe/stripe.controller.ts
    @Get('success')
    async successPage(@Query('session_id') sessionId: string) {
        const result = await this.stripeService.getStripeSuccess(sessionId);
        return {
            success: true,
            message: 'Payment successful.',
            data: result,
        };
    }

    @Get('cancel')
    cancelPage() {
        return {
            success: false,
            message: 'Payment cancelled.',
        };
    }

    //Check payment status
    @Get('status/:sessionId')
    async getStatus(@Param('sessionId') sessionId: string) {
        const result = await this.stripeService.getStripeSuccess(sessionId);
        return {
            success: true,
            message: 'Fetched payment status successfully',
            data: result,
        };
    }
}