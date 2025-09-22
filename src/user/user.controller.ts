import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation, ApiResponse, ApiBearerAuth, ApiBadRequestResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/auth/AuthGuard';
import { Request } from 'express';
import { userPayloadType } from 'src/common/types/auth.types';
import { Roles } from 'src/common/auth/AuthRoles';
import { UserRole } from 'src/common/enums/auth-roles.enum';
import { Pagination, PaginationParams } from 'src/common/pagination/pagination.decorator';
import { paginateResponse } from 'src/common/pagination/pagination.helper';

@ApiTags('Users')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }
    /*
     Get user profile
     */
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
    })
    @ApiBearerAuth()
    @ApiBadRequestResponse({
        description: 'User not found',
    })
    @Get()
    async getProfile(@Req() req: Request) {
        const user = req['user'] as userPayloadType;
        const userProfile = await this.userService.getUserProfile(user.email);
        return {
            success: true,
            message: 'User profile retrieved successfully',
            data: userProfile,
        };
    }

    //get all users
    @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiResponse({
        status: 200,
        description: 'Users retrieved successfully',
    })
    @ApiBearerAuth()
    @ApiBadRequestResponse({
        description: 'No users found',
    })
    @Get('all')
    async getAllUsers(@Pagination() pagination: PaginationParams, @Req() req: Request) {
        const result = await this.userService.getAllUsers(pagination.page, pagination.limit);
        const { users, total } = result;
        const paginatedData = paginateResponse(users, total, pagination.page, pagination.limit, req);
        return {
            success: true,
            message: 'Users retrieved successfully',
            data: paginatedData,
        };
    }

    //get all admins
    @Roles(UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Get all admins (Superadmin only)' })
    @ApiResponse({
        status: 200,
        description: 'Admins retrieved successfully',
    })
    @ApiBearerAuth()
    @ApiBadRequestResponse({
        description: 'No admins found',
    })
    @Get('all-admins')
    async getAllAdmins(@Pagination() pagination: PaginationParams, @Req() req: Request) {
        const result = await this.userService.getAllAdmins(pagination.page, pagination.limit);
        const { users, total } = result;
        const paginatedData = paginateResponse(users, total, pagination.page, pagination.limit, req);
        return {
            success: true,
            message: 'Admins retrieved successfully',
            data: paginatedData,
        };
    }
}
