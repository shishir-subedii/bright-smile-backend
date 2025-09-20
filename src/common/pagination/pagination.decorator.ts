import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PaginationParams {
    page: number;
    limit: number;
}

export const Pagination = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): PaginationParams => {
        const request = ctx.switchToHttp().getRequest();
        const page = parseInt(request.query.page, 10) || 1;
        const limit = parseInt(request.query.limit, 10) || 10;
        return { page, limit };
    },
);
