// import { Module } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';

// @Module({
//     imports: [
//         TypeOrmModule.forRootAsync({
//             useFactory: async (configService: ConfigService) => ({
//                 type: 'postgres',
//                 host: configService.get<string>('DB_HOST'),
//                 port: configService.get<number>('DB_PORT'),
//                 username: configService.get<string>('DB_USERNAME'),
//                 password: configService.get<string>('DB_PASSWORD'),
//                 database: configService.get<string>('DB_NAME'),
//                 autoLoadEntities: true,
//                 synchronize: true, // ❗ Don't use in production
//                 // ssl: {
//                 //     rejectUnauthorized: false, // Required by Neon
//                 // },
//             }),
//             inject: [ConfigService],
//         }),
//     ],
// })
// export class DatabaseModule { }


import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get<string>('DB_USERNAME'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_NAME'),

                autoLoadEntities: true,

                synchronize: true, // Disable in production

                ssl: {
                    rejectUnauthorized: false,
                },
            }),
        }),
    ],
})
export class DatabaseModule { }

