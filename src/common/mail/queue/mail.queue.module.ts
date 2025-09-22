// src/mail/mail.queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailQueueProcessor } from './mail.queue.processor';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'mail-queue',
        }),
    ],
    providers: [MailQueueProcessor],
    exports: [BullModule],
})
export class MailQueueModule { }
