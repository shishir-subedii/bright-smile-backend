export type loginResponseType = {
    accessToken: string;
    role: string;
}

export type userPayloadType = {
    id: string;
    email: string;
    role: string;
}

// export enum UserRole {
//     USER = 'user',
//     ADMIN = 'admin',
// }

/*
✅ Recommended Way:
user-role.enum.ts

export enum UserRole {
  SEEKER = 'seeker',
  EMPLOYER = 'employer',
}

user.entity.ts

@Column({
  type: 'enum',
  enum: UserRole,
  default: UserRole.SEEKER,
})
role: UserRole;

user-register.dto.ts

import { IsEnum, IsString } from 'class-validator';
import { UserRole } from '../../user/entity/user-role.enum';

export class UserRegisterDto {
  @IsString()
  name: string;

  @IsEnum(UserRole, { message: 'Role must be seeker or employer' })
  role: UserRole;

  // other fields...
}

user.service.ts

const newUser = this.usersRepository.create({
  name: userData.name,
  email: userData.email,
  password: hashedPassword,
  role: userData.role,   // ✅ Directly use the value from validated DTO
});

*/