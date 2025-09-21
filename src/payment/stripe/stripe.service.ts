import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from 'src/appointment/entities/appointment.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(
        @InjectRepository(Appointment)
        private readonly appointmentRepo: Repository<Appointment>,
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2025-08-27.basil', // keep Stripe API version updated
        });
    }

    /**
     * Create checkout session for appointment
     */
    async createCheckoutSession(appointmentId: string) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: ['payment', 'user'],
        });

        if (!appointment) throw new BadRequestException('Appointment not found');
        if (appointment.paymentStatus !== PaymentStatus.PENDING) {
            throw new BadRequestException('Payment already processed');
        }

        if(appointment.paymentMethod !== PaymentMethod.STRIPE){
            throw new BadRequestException('Appointment is not set for Stripe payment');
        }

        // create payment entity
        const payment = this.paymentRepo.create({
            amount: appointment.price,
            method: PaymentMethod.STRIPE,
            status: PaymentStatus.PENDING,
            appointment,
        });
        await this.paymentRepo.save(payment);

        const session = await this.stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: appointment.user.email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: Math.round(Number(appointment.price) * 100), // in cents
                        product_data: {
                            name: `Appointment with Dr. ${appointment.doctor?.name || 'Doctor'}`,
                            description: `On ${appointment.date} at ${appointment.time}`,
                        },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${process.env.FRONTEND_URL}/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payments/stripe/cancel`,
            metadata: {
                appointmentId: appointment.id,
                paymentId: payment.id,
            },
        });
        if(session.url){
            payment.stripeCheckoutUrl = session.url;
            await this.paymentRepo.save(payment);
        }
        return session;
    }

    /**
     * Handle webhook events
     */
    async handleWebhook(event: Stripe.Event) {
        console.log('Stripe webhook event:', event.type);
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const appointmentId = session.metadata?.appointmentId;
            const paymentId = session.metadata?.paymentId;

            if (appointmentId && paymentId) {
                const payment = await this.paymentRepo.findOne({
                    where: { id: paymentId },
                    relations: ['appointment'],
                });

                if (payment) {
                    payment.status = PaymentStatus.PAID;
                    payment.transactionId = session.payment_intent!.toString();
                    payment.sessionId = session.id;
                    payment.stripeCheckoutUrl = null;
                    await this.paymentRepo.save(payment);

                    const appointment = payment.appointment;
                    appointment.paymentStatus = PaymentStatus.PAID;
                    appointment.status = AppointmentStatus.BOOKED;
                    appointment.paymentMethod = PaymentMethod.STRIPE;
                    await this.appointmentRepo.save(appointment);
                }
            }
        }
    }

    async getStripeSuccess(sessionId: string) {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent'],
        });

        if (!session) {
            throw new BadRequestException('Session not found in Stripe');
        }

        return {
            paymentStatus: session.payment_status,
            paymentIntent: session.payment_intent,
            session: session,
        }
    }

    async getSessionStatus(sessionId: string){
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            throw new BadRequestException('Session not found in Stripe');
        }
        return session;
    }
}

