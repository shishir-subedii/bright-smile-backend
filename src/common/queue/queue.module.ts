// src/common/queues/queues.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'mail-queue',
        }),
        BullModule.registerQueue({
            name: 'appointment-queue',
        }),
    ],
    exports: [
        BullModule, // export BullModule so queues can be injected elsewhere
    ],
})
export class QueuesModule { }
