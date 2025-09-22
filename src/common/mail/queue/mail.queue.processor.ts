import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../mail.service';

@Processor('mail-queue')
export class MailQueueProcessor extends WorkerHost {
    constructor(private readonly mailService: MailService) {
        super();
    }

    async process(job: Job<any>) {
        switch (job.name) {
            case 'send-signup-otp':
                const { userEmail, userName, otp } = job.data;
                await this.mailService.sendSignupOtp(userEmail, userName, otp);
                break;

            case 'send-confirmation-email':
                const { fileName, fileUrl, userEmail: email, userName: name } = job.data;
                await this.mailService.sendAppointmentConfirmation(email, name, fileName, fileUrl);
                break;

            default:
                console.warn(`No processor defined for job name: ${job.name}`);
                break;
        }
    }
}
