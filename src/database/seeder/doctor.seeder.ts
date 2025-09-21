import { DataSource } from 'typeorm';
import { Doctor, IdType } from 'src/doctor/entities/doctor.entity';

export async function DoctorSeeder(dataSource: DataSource) {
    const doctorRepository = dataSource.getRepository(Doctor);

    // Example doctors to insert
    const doctors = [
        {
            id: '81851f67-41f1-4213-bda4-5d8755c1c381',
            name: 'Dr. John Doe',
            specialization: 'Dentist',
            idType: IdType.LICENSE,
            idNumber: 'LIC-12345',
        },
        {
            name: 'Dr. Jane Smith',
            specialization: 'Orthodontist',
            idType: IdType.CITIZENSHIP,
            idNumber: 'CIT-98765',
        },
        {
            name: 'Dr. Michael Johnson',
            specialization: 'Surgeon',
            idType: IdType.PASSPORT,
            idNumber: 'PAS-54321',
        },
    ];

    for (const doctorData of doctors) {
        const exists = await doctorRepository.findOne({
            where: { idNumber: doctorData.idNumber },
        });

        if (!exists) {
            await doctorRepository.save(doctorRepository.create(doctorData));
            console.log(`Seeded doctor: ${doctorData.name}`);
        } else {
            console.log(`Doctor already exists: ${doctorData.name}`);
        }
    }
}
