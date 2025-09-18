import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entity/user.entity';
import { UserRole } from 'src/common/enums/auth-roles.enum';

export async function SuperAdminSeeder(dataSource: DataSource) {
    const userRepository = dataSource.getRepository(User);

    const existing = await userRepository.findOne({ where: { email: 'superadmin@default.com' } });

    if (!existing) {
        const hashedPassword = await bcrypt.hash('demodemo123', 10);

        await userRepository.save(
            userRepository.create({
                name: 'Super Admin',
                email: 'superadmin@default.com',
                password: hashedPassword,
                accessTokens: [],
                role: UserRole.SUPERADMIN,
                isVerified: true
            }),
        );

        console.log('SuperAdmin user seeded');
    } else {
        console.log('SuperAdmin user already exists');
    }
}
