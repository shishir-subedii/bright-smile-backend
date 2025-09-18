import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
    catch(exception: MulterError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if(process.env.APP_ENV !== 'production'){
            console.error('Multer Error:', exception);
        }

        if (exception.code === 'LIMIT_FILE_SIZE') {
            return response.status(400).json({
                success: false,
                statusCode: 400,
                message: 'File too large. Max allowed size is 5MB.',
                data: null
            });
        }

        return response.status(400).json({
            success: false,
            statusCode: 400,
            message: exception.message || 'Invalid file upload.',
            data: null
        });
    }
}

//@UseFilters(MulterExceptionFilter)