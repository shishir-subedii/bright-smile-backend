
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/user.module';
import { AppConfigModule } from './common/config/config.module';
import { DatabaseModule } from './database/database.module';
import { JwtmoduleModule } from './common/jwtmodule/jwtmodule.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppointmentModule } from './appointment/appointment.module';
import { DoctorModule } from './doctor/doctor.module';
import { PaymentModule } from './payment/payment.module';
import { CoreModule } from './common/core/core.module';
// import { BullModule } from '@nestjs/bullmq';
// import { MailQueueModule } from './common/mail/queue/mail.queue.module';
import { HolidayModule } from './holiday/holiday.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('RATE_LIMIT_TTL', 60000),
            limit: configService.get<number>('RATE_LIMIT_MAX', 70),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    // BullModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => {
    //     const isProduction =
    //       configService.get<string>('APP_ENV') === 'production';
    //
    //     if (isProduction) {
    //       return {
    //         connection: {
    //           host: configService.get<string>('REDIS_HOST'),
    //           port: configService.get<number>('REDIS_PORT', 6379),
    //           username: configService.get<string>('REDIS_USERNAME', 'default'),
    //           password: configService.get<string>('REDIS_PASSWORD'),
    //           tls: {},
    //         },
    //       };
    //     }
    //
    //     return {
    //       connection: {
    //         host: 'localhost',
    //         port: 6379,
    //       },
    //     };
    //   },
    // }),
    // MailQueueModule,
    DatabaseModule,
    CoreModule,
    UsersModule,
    AuthModule,
    AppConfigModule,
    JwtmoduleModule,
    FileUploadModule,
    AppointmentModule,
    DoctorModule,
    PaymentModule,
    HolidayModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // add throttler guard globally
    },
  ],
})
export class AppModule { }
