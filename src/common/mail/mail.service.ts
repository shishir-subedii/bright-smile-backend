import { Injectable, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private readonly fromName: string;

    constructor(
        @Inject('MAIL_TRANSPORTER') private readonly transporter: nodemailer.Transporter,
        private readonly config: ConfigService,
    ) {
        this.fromName = this.config.get<string>('MAIL_FROM_NAME') || 'DineDesk';
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
}
