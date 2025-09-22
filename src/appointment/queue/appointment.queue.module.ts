import { forwardRef, Module } from '@nestjs/common';
import { AppointmentQueueProcessor } from './appointment.queue.processor';
import { AppointmentModule } from '../appointment.module';
import { QueuesModule } from 'src/common/queue/queue.module';

@Module({
    imports: [
        forwardRef(() => AppointmentModule),
        QueuesModule
    ],
    providers: [AppointmentQueueProcessor],
    exports: [], // nothing to export if you don’t need to inject anything
})
export class AppointmentQueueModule { }
