import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Currency, Payment, PaymentMethod, PaymentStatus } from "../entities/payment.entity";
import { Repository } from "typeorm";
import { Appointment, AppointmentStatus } from "src/appointment/entities/appointment.entity";
import { APPOINTMENT_FEE_NPR } from "src/common/constants/appointment";
import { Response } from "express";
import * as crypto from 'crypto'
import axios, { Axios, AxiosResponse } from 'axios';
import { AppointmentService } from "src/appointment/appointment.service";

@Injectable()
export class eSewaService {
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,

        @InjectRepository(Appointment)
        private readonly appointmentRepo: Repository<Appointment>,

        private readonly appointmentService: AppointmentService
    ) { }

    async generateUniqueId() {
        return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async generateHmacSha256Hash(data, secret) {
        if (!data || !secret) {
            throw new Error("Both data and secret are required to generate a hash.");
        }

        // Create HMAC SHA256 hash and encode it in Base64
        const hash = crypto
            .createHmac("sha256", secret)
            .update(data)
            .digest("base64");

        return hash;
    }
    async initiatePayment(userId: string, appointmentId: string) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId, user: { id: userId } },
            relations: ['payment', 'user'],
        })
        if(!appointment) throw new Error('Appointment not found');
        if(appointment.paymentStatus !== PaymentStatus.PENDING){
            throw new Error('Payment already processed');
        }
        if(appointment.paymentMethod !== PaymentMethod.ESEWA || appointment.currency !== Currency.NPR){
            throw new Error('Appointment is not set for eSewa payment');
        }

        const txn_uuid = await this.generateUniqueId();
        // create payment entity
        const payment = this.paymentRepo.create({
            amount: appointment.price,
            currency: appointment.currency,
            method: PaymentMethod.ESEWA,
            status: PaymentStatus.PENDING,
            transactionId: txn_uuid,
            appointment,
        });
        await this.paymentRepo.save(payment);

        const paymentData = {
            amount: String(APPOINTMENT_FEE_NPR),
            failure_url: process.env.ESEWA_FAILURE_URL,
            product_delivery_charge: "0",
            product_service_charge: "0",
            // merchant code from eSewa
            product_code: process.env.ESEWA_MERCHANT_ID || 'EPAYTEST',
            signed_field_names: "total_amount,transaction_uuid,product_code",
            success_url: process.env.ESEWA_SUCCESS_URL,
            tax_amount: "0",
            total_amount: String(APPOINTMENT_FEE_NPR),
            transaction_uuid: txn_uuid,
        };
        const data = `total_amount=${paymentData.amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`;
        const signature = await this.generateHmacSha256Hash(data, process.env.ESEWA_SECRET_KEY);
        const paymentConfig = {
            url: process.env.ESEWA_PAYMENT_URL,
            data: { ...paymentData, signature },
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            responseHandler: (response: AxiosResponse) => response.request?.res?.responseUrl,
        };
        
        // Make payment request
        const paymentReq = await axios.post(String(paymentConfig.url), paymentConfig.data, {
            headers: paymentConfig.headers,
        });

        const paymentUrl = paymentConfig.responseHandler(paymentReq);
        if (!paymentUrl) {
            throw new Error("Payment URL is missing in the response");
        }
        payment.eSewaSignature = signature;
        payment.checkoutUrl = paymentUrl;
        payment.sessionId = appointmentId; // using appointmentId as sessionId for tracking
        await this.paymentRepo.save(payment);
        return { paymentUrl };
    }

    //BUG: if user pays with previous txn_uuid, it will not update the payment status but user still had paid. so it's long day.
    async verifyPayment(data: string) {
        //decode base64 → utf8 string
        const decoded = Buffer.from(data, 'base64').toString('utf8');

        //parse JSON
        const parsed = JSON.parse(decoded);
        const { transaction_code, status, total_amount, transaction_uuid, signature } = parsed;

        //find payment by transaction_uuid
        const payment = await this.paymentRepo.findOne({
            where: { transactionId: transaction_uuid },
            relations: ['appointment'],
        });
        if (!payment) {
            throw new Error('Payment not found');
        }
        const appointment = payment.appointment;
        if (!appointment) {
            throw new Error('Associated appointment not found');
        }
        if (payment.status === PaymentStatus.PAID) {
            throw new Error('Payment already verified');
        }
        if(appointment.status !== AppointmentStatus.PENDING){
            throw new Error('Appointment is not in a valid state for payment verification');
        }
        //check status
        if (status !== 'COMPLETE') {
            payment.status = PaymentStatus.FAILED;
            await this.paymentRepo.save(payment);
            throw new Error('Payment failed at eSewa');
        }
        //check amount
        if (Number(total_amount) !== Number(payment.amount)) {
            payment.status = PaymentStatus.FAILED;
            await this.paymentRepo.save(payment);
            throw new Error('Payment amount mismatch');
        }
        //save data into payment entity
        payment.status = PaymentStatus.PAID;
        payment.eSewaSignature = signature;
        payment.transactionCode = transaction_code;
        await this.paymentRepo.save(payment);
        //update appointment status
        appointment.status = AppointmentStatus.BOOKED;
        appointment.paymentStatus = PaymentStatus.PAID;
        appointment.paymentMethod = PaymentMethod.ESEWA;
        await this.appointmentRepo.save(appointment);
        const findAppointment = await this.appointmentRepo.findOne({
            where: { id: appointment.id },
            relations: ['user', 'payment'],
        });

        await this.appointmentService.generateAndSendAppointmentConfirmation(findAppointment?.user.id!, appointment.id)
        
        return {
            appointmentId: appointment.id,
            paymentId: payment.id,
            amount: payment.amount,
            status: payment.status,
            message: 'Payment verified successfully',
        }
    }

    async checkPaymentStatus(userId: string, appointmentId: string) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId, user: { id: userId } },
            relations: ['payment', 'user'],
        });

        if (!appointment) {
            throw new Error('Appointment not found');
        }

        if (appointment.paymentMethod !== PaymentMethod.ESEWA) {
            throw new Error('Appointment is not set for eSewa payment');
        }

        const payment = appointment.payment;
        if (!payment) {
            throw new Error('Payment not found for this appointment');
        }

        // if already marked paid in DB, just return
        if (payment.status === PaymentStatus.PAID) {
            return {
                appointmentId: appointment.id,
                paymentId: payment.id,
                amount: payment.amount,
                status: payment.status,
                message: 'Payment already completed',
            };
        }

        // 🔥 call eSewa Transaction Status API
        const url = `${process.env.ESEWA_TRANSACTION_URL}?product_code=${process.env.ESEWA_MERCHANT_ID}&total_amount=${payment.amount}&transaction_uuid=${payment.transactionId}`;

        try {
            const response = await axios.get(url, {
                headers: { 'Content-Type': 'application/json' },
            });

            const data = response.data;

            if (data.status === 'COMPLETE') {
                payment.status = PaymentStatus.PAID;
                payment.transactionCode = data.transaction_code;
                await this.paymentRepo.save(payment);

                appointment.status = AppointmentStatus.BOOKED;
                appointment.paymentStatus = PaymentStatus.PAID;
                await this.appointmentRepo.save(appointment);

                return {
                    appointmentId: appointment.id,
                    paymentId: payment.id,
                    amount: payment.amount,
                    status: payment.status,
                    message: 'Payment verified successfully with eSewa',
                };
            } else {
                // failed or pending
                payment.status = PaymentStatus.FAILED;
                await this.paymentRepo.save(payment);

                return {
                    appointmentId: appointment.id,
                    paymentId: payment.id,
                    amount: payment.amount,
                    status: PaymentStatus.FAILED,
                    message: 'Payment failed or not completed yet',
                };
            }
        } catch (error) {
            throw new Error('Could not verify payment with eSewa');
        }
    }

}