import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
} from '@nestjs/common';
import { UserRegisterDto } from './dto/UserRegisterDto';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserLoginDto } from './dto/UserLoginDto';
import { changePasswordDto } from './dto/ChangePasswordDto';
import { loginResponseType } from 'src/common/types/auth.types';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import { UserRole } from 'src/common/enums/auth-roles.enum';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';

@Injectable()
export class AuthService {
    constructor(
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private jwt: JwtService,
        @InjectRepository(User) private usersRepository: Repository<User>,
    ) { }

    async register(user: UserRegisterDto) {
        if (user.password !== user.confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }
        return await this.userService.register(user);
    }

    async googleLogin(googleUser: any) {
        if (!googleUser) {
            return { message: 'No user from Google' };
        }

        // Check if user already exists by googleId
        let user = await this.usersRepository.findOne({
            where: { googleId: googleUser.googleId },
        });

        if (!user) {
            // Check if a user exists with the same email (maybe they signed up with email/password before)
            user = await this.usersRepository.findOne({
                where: { email: googleUser.email },
            });

            if (user) {
                // Link Google account
                user.googleId = googleUser.googleId;
                user.isVerified = true;
                await this.usersRepository.save(user);
            } else {
                // Create a new user
                user = this.usersRepository.create({
                    email: googleUser.email,
                    name: `${googleUser.firstName} ${googleUser.lastName}`,
                    googleId: googleUser.googleId,
                    isVerified: true,
                    password: null, // No password for OAuth users
                    authProvider: AuthProvider.GOOGLE,
                    accessTokens: [],
                    role: UserRole.USER, // default role
                });
                await this.usersRepository.save(user);
            }
        }

        // Generate JWT using your existing genTokens method
        const { accessToken } = await this.genTokens(user.id, user.email, user.role);

        // Add token to user's accessTokens array
        await this.userService.addAccessToken(user.email, accessToken);

        return {
            accessToken,
            role: user.role,
            authProvider: user.authProvider
        };
    }


    async login(loginData: UserLoginDto): Promise<loginResponseType> {
        const { email, password } = loginData;
        if (!email || !password) {
            throw new BadRequestException('Email and Password are required');
        }

        const user = await this.userService.findCompleteProfileByEmail(email);
        if (!user) {
            throw new BadRequestException('Invalid credentials');
        }

        if (!user.password) {
            throw new BadRequestException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new BadRequestException('Invalid credentials');
        }

        const { accessToken } = await this.genTokens(
            user.id.toString(),
            user.email,
            user.role,
        );

        // ✅ Add the generated token to accessTokens list
        await this.userService.addAccessToken(user.email, accessToken);

        return {
            accessToken,
            role: user.role,
            authProvider: user.authProvider
        };
    }

    async verifySignupOtp(token: string, otp: string) {
        const payload: { id: string; email: string; role: string } =
            this.jwt.verify(token, {
                secret: process.env.JWT_ACCESS_SECRET,
            });
        return await this.userService.verifySignupOtp(payload.email, otp);

    }

    async logout(email: string, token: string) {
        // ✅ Remove only the current token (per-session logout)
        await this.userService.removeAccessToken(email, token);
    }

    async logoutAllSessions(email: string, password: string) {
        const user = await this.userService.findCompleteProfileByEmail(email);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password!);
        if (!isPasswordValid) {
            throw new BadRequestException('Invalid password');
        }

        await this.userService.removeAllAccessTokens(email);
    }


    async genTokens(id: string, email: string, role: string) {
        const accessToken = this.jwt.sign(
            { id, email, role },
            {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: process.env.JWT_ACCESS_EXPIRE,
            },
        );

        return { accessToken };
    }

    async changePassword(email: string, body: changePasswordDto) {
        const updatedUser = await this.userService.changePassword(email, body);
        if (!updatedUser) {
            throw new BadRequestException('User not found or password change failed');
        }
        return updatedUser;
    }

    //assign admin
    async assignAdmin(email: string) {
        return await this.userService.assignAdmin(email);
    }
    
}
