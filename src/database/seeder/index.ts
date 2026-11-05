// import 'dotenv/config';
// import { DataSource } from 'typeorm';
// import { SuperAdminSeeder } from './superadmin.seeder';
// import { DoctorSeeder } from './doctor.seeder';
// import { UserSeeder } from './user.seeder';
// import { AdminSeeder } from './admin.seeder';
// import { OfficeHoursSeeder } from './office-hours.seeder';

// const AppDataSource = new DataSource({
//     type: 'postgres',
//     host: process.env.DB_HOST,
//     port: parseInt(process.env.DB_PORT || '5432'),
//     username: process.env.DB_USERNAME,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     entities: [__dirname + '/../../**/*.entity.{ts,js}'],
//     synchronize: true,
// });


// async function main() {
//     try {
//         await AppDataSource.initialize();
//         console.log('Connected to Postgres');

//         await SuperAdminSeeder(AppDataSource);
//         await AdminSeeder(AppDataSource);
//         await DoctorSeeder(AppDataSource);
//         await UserSeeder(AppDataSource);
//         await OfficeHoursSeeder(AppDataSource);

//         await AppDataSource.destroy();
//         console.log('Disconnected from Postgres');
//     } catch (error) {
//         console.error('Seeder failed:', error);
//         process.exit(1);
//     }
// }

// main();



import 'dotenv/config';
import { DataSource } from 'typeorm';

import { SuperAdminSeeder } from './superadmin.seeder';
import { DoctorSeeder } from './doctor.seeder';
import { UserSeeder } from './user.seeder';
import { AdminSeeder } from './admin.seeder';
import { OfficeHoursSeeder } from './office-hours.seeder';

const AppDataSource = new DataSource({
    type: 'postgres',

    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    entities: [__dirname + '/../../**/*.entity.{ts,js}'],

    synchronize: true,

    ssl: {
        rejectUnauthorized: false,
    },
});

async function main() {
    try {
        await AppDataSource.initialize();
        console.log('Connected to Neon PostgreSQL');

        await SuperAdminSeeder(AppDataSource);
        await AdminSeeder(AppDataSource);
        await DoctorSeeder(AppDataSource);
        await UserSeeder(AppDataSource);
        await OfficeHoursSeeder(AppDataSource);

        console.log('All seeders completed successfully');

        await AppDataSource.destroy();
        console.log('Disconnected from PostgreSQL');
    } catch (error) {
        console.error('Seeder failed:', error);

        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }

        process.exit(1);
    }
}

main();
