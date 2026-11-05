// import {
//     ExceptionFilter,
//     Catch,
//     ArgumentsHost,
//     HttpException,
//     HttpStatus,
// } from '@nestjs/common';
// import { Request, Response } from 'express';

// @Catch()
// export class GlobalExceptionFilter implements ExceptionFilter {
//     catch(exception: unknown, host: ArgumentsHost) {
//         const ctx = host.switchToHttp();
//         const response = ctx.getResponse<Response>();
//         const request = ctx.getRequest<Request>();

//         const status =
//             exception instanceof HttpException
//                 ? exception.getStatus()
//                 : HttpStatus.INTERNAL_SERVER_ERROR;

//         const message =
//             exception instanceof HttpException
//                 ? exception.getResponse()
//                 : 'Internal server error';

//         response.status(status).json({
//             success: false,
//             statusCode: status,
//             path: request.url,
//             timestamp: new Date().toISOString(),
//             message,
//         });
//     }
// }

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { isProd } from 'src/common/utils/checkMode';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Important: Never send a second response
        if (response.headersSent) {
            this.logger.error(
                `Headers already sent for ${request.method} ${request.url}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
            return;
        }

        if (!isProd()) {
            this.logger.error(
                'Exception caught:',
                exception instanceof Error ? exception.stack : String(exception),
            );
        }

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        const message =
            typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as any).message || 'Something went wrong';

        response.status(status).json({
            success: false,
            statusCode: status,
            path: request.url,
            timestamp: new Date().toISOString(),
            error: message,
            message,
            data: null,
        });
    }
}