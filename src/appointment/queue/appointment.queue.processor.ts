// src/appointment/queue/appointment.queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppointmentService } from '../appointment.service';

@Processor('appointment-queue')
export class AppointmentQueueProcessor extends WorkerHost {
    constructor(private readonly appointmentService: AppointmentService) {
        super();
    }

    async process(job: Job<any>) {
        switch (job.name) {
            case 'cancel-appointment':
                const { appointmentId } = job.data;
                await this.appointmentService.cancelIfPending(appointmentId);
                break;

            default:
                console.warn(`No processor defined for job: ${job.name}`);
        }
    }
}
