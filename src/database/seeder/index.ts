import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SuperAdminSeeder } from './superadmin.seeder';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + '/../../**/*.entity.{ts,js}'],
    synchronize: true,
});


async function main() {
    try {
        await AppDataSource.initialize();
        console.log('Connected to Postgres');

        await SuperAdminSeeder(AppDataSource);

        await AppDataSource.destroy();
        console.log('Disconnected from Postgres');
    } catch (error) {
        console.error('Seeder failed:', error);
        process.exit(1);
    }
}

main();
