import { Request } from 'express';

export function paginateResponse<T>(
    entities: T[],
    total: number,
    page: number,
    limit: number,
    req: Request,
) {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const constructUrl = (p: number) => {
        const query = { ...req.query, page: p };
        const queryString = new URLSearchParams(query as any).toString();
        return `${req.protocol}://${req.get('host')}${req.path}?${queryString}`;
    };

    return {
        paginatedData: entities,
        meta: {
            total,
            page,
            limit,
            totalPages,
            nextPageUrl: hasNextPage ? constructUrl(page + 1) : null,
            prevPageUrl: hasPrevPage ? constructUrl(page - 1) : null,
            firstPageUrl: constructUrl(1),
            lastPageUrl: constructUrl(totalPages),
            hasNextPage,
            hasPrevPage,
        },
    };
}
