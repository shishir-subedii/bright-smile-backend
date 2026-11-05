
import {
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as handlebars from 'handlebars';

interface BrevoEmailPayload {
    sender: {
        name: string;
        email: string;
    };
    to: Array<{
        email: string;
        name?: string;
    }>;
    subject: string;
    htmlContent: string;
    textContent?: string;
    attachment?: Array<{
        name: string;
        content: string;
    }>;
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';
    private readonly fromName: string;
    private readonly senderEmail: string;
    private readonly apiKey: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly config: ConfigService,
    ) {
        this.fromName =
            this.config.get<string>('MAIL_FROM_NAME') || 'BrightSmile';

        this.senderEmail =
            this.config.get<string>('BREVO_SENDER_EMAIL') || '';

        this.apiKey =
            this.config.get<string>('BREVO_API_KEY') || '';
    }

    /**
     * Compile Handlebars email template
     */
    private compileTemplate(
        templateName: string,
        context: any,
    ): string {
        const filePath = join(
            process.cwd(),
            'src/common/mail/templates',
            `${templateName}.hbs`,
        );

        if (!existsSync(filePath)) {
            throw new NotFoundException(
                `Email template not found: ${templateName}`,
            );
        }

        const source = readFileSync(filePath, 'utf-8');
        const template = handlebars.compile(source);

        return template(context);
    }

    /**
     * Send email using Brevo API
     */
    private async sendEmail(
        payload: BrevoEmailPayload,
    ): Promise<void> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    this.apiUrl,
                    payload,
                    {
                        headers: {
                            accept: 'application/json',
                            'api-key': this.apiKey,
                            'content-type': 'application/json',
                        },
                        timeout: 15000,
                    },
                ),
            );

            this.logger.log(
                `Email accepted by Brevo. Message ID: ${response.data?.messageId}`,
            );
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unknown error';

            this.logger.error(
                `Brevo email sending failed: ${message}`,
            );

            throw new InternalServerErrorException(
                'Unable to send email notification',
            );
        }
    }

    /**
     * Common sender configuration
     */
    private getSender() {
        return {
            name: this.fromName,
            email: this.senderEmail,
        };
    }

    /**
     * Send custom email
     */
    async sendCustomMail(
        to: string,
        subject: string,
        content: string,
    ): Promise<void> {
        const html = this.compileTemplate('custom', {
            subject,
            content,
            fromName: this.fromName,
        });

        await this.sendEmail({
            sender: this.getSender(),
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: content,
        });
    }

    /**
     * Send signup OTP
     */
    async sendSignupOtp(
        email: string,
        name: string,
        otp: string,
    ): Promise<void> {
        const html = this.compileTemplate('signup-otp', {
            subject: 'Verify your account',
            title: 'Email Verification',
            name,
            otp,
            action: 'verify your account',
            expiry: 10,
            fromName: this.fromName,
        });

        await this.sendEmail({
            sender: this.getSender(),
            to: [{ email, name }],
            subject: 'Verify your account - OTP',
            htmlContent: html,
            textContent: `Hello ${name}, your verification OTP is ${otp}. It expires in 10 minutes.`,
        });
    }

    /**
     * Send forgot password OTP
     */
    async sendForgotPasswordOtp(
        email: string,
        name: string,
        otp: string,
    ): Promise<void> {
        const html = this.compileTemplate(
            'forgot-password-otp',
            {
                subject: 'Password Reset',
                title: 'Forgot Password Request',
                name,
                otp,
                action: 'reset your password',
                expiry: 10,
                fromName: this.fromName,
            },
        );

        await this.sendEmail({
            sender: this.getSender(),
            to: [{ email, name }],
            subject: 'Reset your password - OTP',
            htmlContent: html,
            textContent: `Hello ${name}, your password reset OTP is ${otp}. It expires in 10 minutes.`,
        });
    }

    /**
     * Send appointment confirmation with PDF attachment
     */
    async sendAppointmentConfirmation(
        email: string,
        name: string,
        fileName: string,
        fileUrl: string,
    ): Promise<void> {
        const filePath = join(
            process.cwd(),
            'uploads',
            'appointments',
            fileName,
        );

        if (!existsSync(filePath)) {
            throw new NotFoundException(
                `File not found: ${filePath}`,
            );
        }

        const html = this.compileTemplate(
            'appointment-confirmation',
            {
                subject: 'Appointment Confirmation',
                title: 'Your Appointment is Confirmed',
                name,
                message:
                    'Please find your appointment confirmation attached as PDF.',
                fileUrl,
                fromName: this.fromName,
            },
        );

        const pdfBuffer = readFileSync(filePath);

        await this.sendEmail({
            sender: this.getSender(),
            to: [{ email, name }],
            subject: 'Appointment Confirmation',
            htmlContent: html,
            textContent:
                `Hello ${name}, your appointment is confirmed. Please find your confirmation PDF attached.`,
            attachment: [
                {
                    name: fileName,
                    content: pdfBuffer.toString('base64'),
                },
            ],
        });

        this.logger.log(
            `Appointment confirmation sent to ${email}`,
        );
    }
}
