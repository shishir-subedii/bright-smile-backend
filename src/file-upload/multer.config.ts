import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { MAX_FILE_SIZE } from './file-upload.config';

// Allowed file types
const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

export const multerConfig = {
    storage: diskStorage({
        destination: (req, file, cb) => {
            let folder = req.params?.folder;

            // fallback: infer from route path (last segment)
            if (!folder && req.route?.path) {
                const parts = req.route.path.split('/');
                folder = parts[parts.length - 1] || 'common';
            }

            const uploadPath = join(__dirname, '../../uploads', folder);

            if (!existsSync(uploadPath)) {
                mkdirSync(uploadPath, { recursive: true });
            }

            cb(null, uploadPath);
        },

        filename: (req, file, cb) => {
            const fileName = `${Date.now()}-${file.originalname}`;
            cb(null, fileName);
        },
    }),

    limits: {
        fileSize: MAX_FILE_SIZE
    },

    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
        }
        cb(null, true);
    },
};
