// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { UsersModule } from 'src/user/user.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { JwtmoduleModule } from 'src/common/jwtmodule/jwtmodule.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    JwtmoduleModule,
    PassportModule.register({ defaultStrategy: 'jwt' }), // registers passport
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy], // no JwtStrategy here
  exports: [AuthService],
})
export class AuthModule { }
