import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'MAIL_TRANSPORTER',
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => {
                return nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: config.get<string>('MAIL_USER'),
                        pass: config.get<string>('MAIL_PASS'),
                    },
                });
            },
        },
        MailService,
    ],
    exports: [MailService],
})
export class MailModule { }
