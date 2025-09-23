import { OfficeHours } from 'src/holiday/entities/office_hours.entity';
import { DataSource } from 'typeorm';

export async function OfficeHoursSeeder(dataSource: DataSource) {
    const repo = dataSource.getRepository(OfficeHours);

    // Example weekly schedule
    const hours = [
        { dayOfWeek: 0, openTime: '10:00', closeTime: '18:00', isClosed: false }, // Sunday
        { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Monday
        { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Tuesday
        { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Wednesday
        { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Thursday
        { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false }, // Friday
        { dayOfWeek: 6, openTime: '00:00', closeTime: '00:00', isClosed: true },  // Saturday closed
    ];

    for (const h of hours) {
        const exists = await repo.findOne({ where: { dayOfWeek: h.dayOfWeek } });
        if (!exists) {
            await repo.save(repo.create(h));
            console.log(`Seeded office hours for day ${h.dayOfWeek}`);
        } else {
            console.log(`Office hours already exist for day ${h.dayOfWeek}`);
        }
    }
}
