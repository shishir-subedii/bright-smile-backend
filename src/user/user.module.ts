import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/common/mail/mail.module';
import { MailQueueModule } from 'src/common/mail/queue/mail.queue.module';
@Module({
    imports: [
        forwardRef(() => AuthModule), 
        MailModule,
        MailQueueModule
    ],
    providers: [UserService],
    controllers: [UserController],
    exports: [UserService]
})
export class UsersModule { }
