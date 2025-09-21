import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Currency, Payment, PaymentMethod, PaymentStatus } from "../entities/payment.entity";
import { Repository } from "typeorm";
import { Appointment } from "src/appointment/entities/appointment.entity";
import { APPOINTMENT_FEE_NPR } from "src/common/constants/appointment-fee";
import { Response } from "express";
import * as crypto from 'crypto'
import axios from 'axios';

@Injectable()
export class eSewaService {
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepo: Repository<Payment>,

        @InjectRepository(Appointment)
        private readonly appointmentRepo: Repository<Appointment>
    ) { }

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
    async initiatePayment(appointmentId: string) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: ['payment', 'user'],
        })
        if(!appointment) throw new Error('Appointment not found');
        if(appointment.paymentStatus !== PaymentStatus.PENDING){
            throw new Error('Payment already processed');
        }
        if(appointment.paymentMethod !== PaymentMethod.ESEWA || appointment.currency !== Currency.NPR){
            throw new Error('Appointment is not set for eSewa payment');
        }
        // create payment entity
        const payment = this.paymentRepo.create({
            amount: appointment.price,
            currency: appointment.currency,
            method: PaymentMethod.ESEWA,
            status: PaymentStatus.PENDING,
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
            transaction_uuid: appointmentId,
        };
        const data = `total_amount=${paymentData.amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`;
        const signature = await this.generateHmacSha256Hash(data, process.env.ESEWA_SECRET_KEY);
        const paymentConfig = {
            url: process.env.ESEWA_PAYMENT_URL,
            data: { ...paymentData, signature },
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            responseHandler: (response) => response.request?.res?.responseUrl,
        };
        console.log('eSewa payment request data:', paymentConfig);
        // Make payment request
        const paymentReq = await axios.post(String(paymentConfig.url), paymentConfig.data, {
            headers: paymentConfig.headers,
        });

        const paymentUrl = paymentConfig.responseHandler(paymentReq);
        if (!paymentUrl) {
            throw new Error("Payment URL is missing in the response");
        }
        payment.sessionId = appointmentId; // using appointmentId as sessionId for tracking
        await this.paymentRepo.save(payment);
        return { paymentUrl };
    }

    async verifyPayment(data: string) {
        console.log('Raw data from eSewa:', data);

        // 1. decode base64 → utf8 string
        const decoded = Buffer.from(data, 'base64').toString('utf8');
        console.log('Decoded eSewa data:', decoded);

        // 2. parse JSON
        const parsed = JSON.parse(decoded);

        console.log('Decoded eSewa payload:', parsed);

        // Example fields:
        // {
        //   "transaction_code": "000C2ELC",
        //   "status": "COMPLETE",
        //   "total_amount": "2400.0",
        //   "transaction_uuid": "562bd5fc-3440-44c0-8bf8-51aceacf42db",
        //   "product_code": "EPAYTEST",
        //   "signed_field_names": "transaction_code,status,total_amount,...",
        //   "signature": "zlvu6+r2/NvoRlT0gLgn/cGHZWmRcGTcWRjrtTYJRmE="
        // }

        return parsed;
    }

    //check status of transaction
    async statusCheck(pid: string, refId: string, amt: number) {
        const url = `${process.env.ESEWA_TRANSACTION_URL}/?product_code=${pid}&total_amount=${amt}&transaction_uuid=${refId}`;
        const response = await axios.get(url);
        return response.data;
    }

}