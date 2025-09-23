import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entity/user.entity';
import { UserRole } from 'src/common/enums/auth-roles.enum';

export async function UserSeeder(dataSource: DataSource) {
    const userRepository = dataSource.getRepository(User);

    const existing = await userRepository.findOne({ where: { email: 'shishirsubedi116@gmail.com' } });

    if (!existing) {
        const hashedPassword = await bcrypt.hash('securePassword123', 10);

        await userRepository.save(
            userRepository.create({
                name: 'Shishir Subedi',
                email: 'shishirsubedi116@gmail.com',
                password: hashedPassword,
                accessTokens: [],
                role: UserRole.USER,
                isVerified: true
            }),
        );

        console.log('User seeded');
    } else {
        console.log('User already exists');
    }
}