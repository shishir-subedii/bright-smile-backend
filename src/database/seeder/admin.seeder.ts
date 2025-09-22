import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entity/user.entity';
import { UserRole } from 'src/common/enums/auth-roles.enum';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';

export async function AdminSeeder(dataSource: DataSource) {
    const userRepository = dataSource.getRepository(User);

    const existing = await userRepository.findOne({ where: { email: 'admin@brightsmile.com' } });

    if (!existing) {
        const hashedPassword = await bcrypt.hash('securePassword123', 10);

        await userRepository.save(
            userRepository.create({
                name: 'Admin',
                email: 'admin@brightsmile.com',
                password: hashedPassword,
                accessTokens: [],
                authProvider: AuthProvider.LOCAL,
                role: UserRole.ADMIN,
                isVerified: true
            }),
        );

        console.log('Admin user seeded');
    } else {
        console.log('Admin user already exists');
    }
}
