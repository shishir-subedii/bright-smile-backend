import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { UserRegisterDto } from 'src/auth/dto/UserRegisterDto';
import * as bcrypt from 'bcrypt';
import { changePasswordDto } from 'src/auth/dto/ChangePasswordDto';
import { AuthService } from 'src/auth/auth.service';
import { MailService } from 'src/common/mail/mail.service';
import { isProd } from 'src/common/utils/checkMode';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private mailservice: MailService,
        private dataSource: DataSource,
        @Inject(forwardRef(() => AuthService))
        private authService: AuthService
    ) { }

    async generateOtp(): Promise<string> {
        const otp = isProd() ? Math.floor(100000 + Math.random() * 900000).toString() : '123456';
        return otp;
    }

    // async register(userData: UserRegisterDto) {
    //     const existingUser = await this.findOneByEmail(userData.email);
    //     if (existingUser) {
    //         throw new BadRequestException('User with this email already exists');
    //     }

    //     const hashedPassword = await bcrypt.hash(userData.password, 10);

    //     const otp = await this.generateOtp();

    //     const newUser = this.usersRepository.create({
    //         name: userData.name,
    //         email: userData.email,
    //         password: hashedPassword,
    //         accessTokens: [], // initialize empty token list
    //         otp,
    //         otpExpiry: new Date(Date.now() + 10 * 60000), // 10 minutes from now
    //         isVerified: false
    //     });

    //     const { accessToken } = await this.authService.genTokens(newUser.id, newUser.email, newUser.role);

    //     await this.usersRepository.save(newUser);
    //     await this.mailservice.sendSignupOtp(userData.email, userData.name, otp);
    //     console.log(accessToken)
    //     return { tempToken: accessToken };
    // }

    //TODO: USE KAFKA TO QUEUE THE EMAIL SENDING TASK.
    async register(userData: UserRegisterDto) {
        return await this.dataSource.transaction(async (manager) => {
            // 1. Check if user exists
            const existingUser = await manager.findOne(User, {
                where: { email: userData.email },
            });
            if (existingUser) {
                if (!existingUser.isVerified) {
                    if (existingUser.otpExpiry) {
                        const now = new Date();
                        const otpIssuedAt = new Date(
                            existingUser.otpExpiry.getTime() - 10 * 60 * 1000
                        ); // expiry - 10min = issued time
                        const secondsSinceOtp = (now.getTime() - otpIssuedAt.getTime()) / 1000;

                        if (secondsSinceOtp < 30) {
                            throw new BadRequestException(
                                "OTP was just sent. Please check your email before requesting again."
                            );
                        }
                    }

                    // overwrite OTP & expiry
                    existingUser.otp = await this.generateOtp();
                    existingUser.otpExpiry = new Date(Date.now() + 10 * 60000);
                    await manager.save(User, existingUser);

                    await this.mailservice.sendSignupOtp(
                        existingUser.email,
                        existingUser.name!,
                        existingUser.otp,
                    );

                    const newToken = await this.authService.genTokens(
                        existingUser.id,
                        existingUser.email,
                        existingUser.role,
                    );

                    return { tempToken: newToken.accessToken, message: "Account exists but not verified. A new OTP has been sent to email" };
                }
                throw new BadRequestException('Invalid credentials');
            }


            // 2. Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // 3. Generate OTP
            const otp = await this.generateOtp();

            // 4. Create user entity
            const newUser = manager.create(User, {
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                accessTokens: [],
                otp,
                otpExpiry: new Date(Date.now() + 10 * 60000),
                isVerified: false,
            });

            // 5. Save user inside transaction

            const savedUser = await manager.save(User, newUser);

            // 6. Generate token (does not touch DB, safe inside txn)
            const { accessToken } = await this.authService.genTokens(
                savedUser.id,
                savedUser.email,
                savedUser.role,
            );

            // 7. Send email ( if this fails, txn rolls back, no user is saved)
            await this.mailservice.sendSignupOtp(
                userData.email,
                userData.name,
                otp,
            );

            return { tempToken: accessToken, message: 'Signup OTP sent successfully. Please check your email.' };
        });
    }

    async verifySignupOtp(email: string, otp: string) {
        const user = await this.usersRepository.findOne({ where: { email, isVerified: false } });
        if (!user) {
            throw new BadRequestException('User not found');
        }
        if (user.otp !== otp) {
            throw new BadRequestException('Invalid OTP');
        }
        if (!user.otpExpiry || user.otpExpiry < new Date()) {
            throw new BadRequestException('OTP expired');
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await this.usersRepository.save(user);
        return true;
    }

    async handleForgotPassword(email: string) {
        const user = await this.findOneByEmail(email);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        const otp = await this.generateOtp();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60000);
        await this.usersRepository.save(user);

        await this.mailservice.sendForgotPasswordOtp(
            user.email,
            user.name!,
            otp,
        );
    }

    //this will return unverified user as well
    async findRawUser(email: string) {
        return this.usersRepository.findOne({ where: { email } });
    }

    async findAll() {
        return this.usersRepository.find();
    }

    async findVerifiedUsers() {
        return this.usersRepository.find({ where: { isVerified: true } });
    }

    async checkVerificationStatus(email: string) {
        const user = await this.findOneByEmail(email);
        if (!user) {
            throw new BadRequestException('User not found');
        }
        if (user.isVerified) {
            return true;
        }
        return false;
    }

    async findOneById(id: string) {
        return this.usersRepository.findOne({ where: { id } });
    }

    async findOneByEmail(email: string) {
        return this.usersRepository.findOne({ where: { email, isVerified: true } });
    }

    async findCompleteProfileByEmail(email: string) {
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .addSelect('user.accessTokens')
            .where('user.email = :email', { email })
            .andWhere('user.isVerified = :isVerified', { isVerified: true })
            .getOne();
    }


    // Add token to user's token array
    async addAccessToken(email: string, newToken: string) {
        const user = await this.findCompleteProfileByEmail(email);
        if (!user) throw new BadRequestException('User not found');

        user.accessTokens = [...(user.accessTokens || []), newToken];
        await this.usersRepository.save(user);
    }

    // Remove a specific token (logout from one device)
    async removeAccessToken(email: string, tokenToRemove: string) {
        const user = await this.findCompleteProfileByEmail(email);
        if (!user) throw new BadRequestException('User not found');

        user.accessTokens = (user.accessTokens || []).filter(
            token => token !== tokenToRemove,
        );
        await this.usersRepository.save(user);
    }

    // Optional: remove all tokens (logout from all devices)
    async removeAllAccessTokens(email: string) {
        await this.usersRepository.update({ email }, { accessTokens: [] });
    }

    async getUserProfile(email: string) {
        const user = await this.findOneByEmail(email);
        if (!user) {
            throw new BadRequestException('User not found');
        }
        return user;
    }

    async changePassword(email: string, body: changePasswordDto) {
        const user = await this.findCompleteProfileByEmail(email);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (body.newPassword !== body.confirmNewPassword) {
            throw new BadRequestException(
                'New password and confirm password do not match',
            );
        }

        if (!user.password) {
            throw new BadRequestException('User not found');
        }

        const isOldPasswordValid = await bcrypt.compare(
            body.oldPassword,
            user.password,
        );
        if (!isOldPasswordValid) {
            throw new BadRequestException('Old password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(body.newPassword, 10);
        user.password = hashedPassword;
        user.accessTokens = []; // logout from all devices after password change

        try {
            return await this.usersRepository.save(user);
        } catch (error) {
            throw new InternalServerErrorException('Failed to change password');
        }
    }
}
