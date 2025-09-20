import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';
import { UserService } from 'src/user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private jwt: JwtService,
        private readonly userService: UserService,
        private reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);


        const req = context.switchToHttp().getRequest<Request>();
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Token not found');
        }

        const token = authHeader.split(' ')[1];
        try {
            const payload: { id: string; email: string; role: string } =
                this.jwt.verify(token, {
                    secret: process.env.JWT_ACCESS_SECRET,
                });
            const user = await this.userService.findCompleteProfileByEmail(payload.email);
            if (!user || !user.accessTokens || !user.accessTokens.includes(token)) {
                throw new UnauthorizedException('User not logged-in');
            }

            if (requiredRoles && !requiredRoles.includes(payload.role)) {
                throw new ForbiddenException(
                    'Forbidden: You are not authorized to access this route',
                );
            }
            req['user'] = payload;
            return true;
        } catch (err) {
            if (err instanceof ForbiddenException) {
                throw err;
            } else if (err instanceof TokenExpiredError) {
                throw new UnauthorizedException('Token expired');
            }
            throw new UnauthorizedException('Invalid token');
        }
    }
}
