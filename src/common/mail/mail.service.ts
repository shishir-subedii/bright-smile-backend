import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private readonly fromName: string;

    constructor(
        @Inject('MAIL_TRANSPORTER') private readonly transporter: nodemailer.Transporter,
        private readonly config: ConfigService,
    ) {
        this.fromName = this.config.get<string>('MAIL_FROM_NAME') || "BrightSmile";
    }

    private compileTemplate(templateName: string, context: any): string {
        const filePath = join(process.cwd(), 'src/common/mail/templates', `${templateName}.hbs`);
        const source = readFileSync(filePath, 'utf-8');
        const template = handlebars.compile(source);
        return template(context);
    }

    async sendCustomMail(to: string, subject: string, content: string) {
        const html = this.compileTemplate('custom', {
            subject,
            content,
            fromName: this.fromName,
        });

        await this.transporter.sendMail({
            from: `"${this.fromName}" <${this.config.get<string>('MAIL_USER')}>`,
            to,
            subject,
            html,
        });
    }

    async sendSignupOtp(email: string, name: string, otp: string) {
        const html = this.compileTemplate('signup-otp', {
            subject: 'Verify your account',
            title: 'Email Verification',
            name,
            otp,
            action: 'verify your account',
            expiry: 10,
            fromName: this.fromName,
        });

        await this.transporter.sendMail({
            from: `"${this.fromName}" <${this.config.get<string>('MAIL_USER')}>`,
            to: email,
            subject: 'Verify your account - OTP',
            html,
        });
    }

    async sendForgotPasswordOtp(email: string, name: string, otp: string) {
        const html = this.compileTemplate('forgot-password-otp', {
            subject: 'Password Reset',
            title: 'Forgot Password Request',
            name,
            otp,
            action: 'reset your password',
            expiry: 10,
            fromName: this.fromName,
        });

        await this.transporter.sendMail({
            from: `"${this.fromName}" <${this.config.get<string>('MAIL_USER')}>`,
            to: email,
            subject: 'Reset your password - OTP',
            html,
        });
    }

    /**
     * Send appointment confirmation email with PDF attachment
     */
    async sendAppointmentConfirmation(email: string, name: string, fileName: string, fileUrl: string) {
        console.log(`Preparing to send appointment confirmation email to ${email} with attachment ${fileName}`);
        const filePath = join(process.cwd(), 'uploads', 'appointments', fileName);

        if (!existsSync(filePath)) {
            throw new NotFoundException(`File not found: ${filePath}`);
        }

        const html = this.compileTemplate('appointment-confirmation', {
            subject: 'Appointment Confirmation',
            title: 'Your Appointment is Confirmed',
            name,
            message: 'Please find your appointment confirmation attached as PDF.',
            fileUrl,
            fromName: this.fromName,
        });
        console.log(`Sending email to ${email} with attachment ${filePath}`);

        try {
            console.log('Starting email transmission...');

            const info = await this.transporter.sendMail({
                from: `"${this.fromName}" <${this.config.get<string>('MAIL_USER')}>`,
                to: email,
                subject: 'Appointment Confirmation',
                html,
                attachments: [
                    {
                        filename: fileName,
                        path: filePath,
                        contentType: 'application/pdf',
                    },
                ],
            });

            console.log('EMAIL SENT SUCCESSFULLY');
            console.log('Message ID:', info.messageId);
            console.log('Accepted:', info.accepted);
            console.log('Rejected:', info.rejected);
            console.log('Response:', info.response);

        } catch (error: any) {
            console.error('EMAIL SENDING FAILED!');
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error command:', error.command);
            console.error('Full error:', error);

            throw error;
        }

        console.log(`Appointment confirmation email sent to ${email} with attachment ${fileName}`);
    }
}
