// // file-upload.utils.ts
// import { FileInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { join } from 'path';
// import { existsSync, mkdirSync } from 'fs';
// import { BadRequestException } from '@nestjs/common';
// import { allowedMimeTypes, MAX_FILE_SIZE } from './file-upload.config';
// import { UploadFolder } from 'src/common/enums/file-upload.enum';

// export const getDiskStorage = (folder: UploadFolder) =>
//     diskStorage({
//         destination: (req, file, cb) => {
//             const uploadPath = join(__dirname, '../../uploads', folder);
//             if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
//             cb(null, uploadPath);
//         },
//         filename: (req, file, cb) => {
//             cb(null, `${Date.now()}-${file.originalname}`);
//         },
//     });

// export const getFileInterceptor = (folder: UploadFolder) =>
//     FileInterceptor('file', {
//         storage: getDiskStorage(folder),
//         fileFilter: (req, file, cb) => {
//             const allowed = allowedMimeTypes[folder];
//             if (!allowed.includes(file.mimetype)) {
//                 return cb(
//                     new BadRequestException(
//                         `Invalid file type for ${folder}. Allowed: ${allowed.join(', ')}`,
//                     ),
//                     false,
//                 );
//             }
//             cb(null, true);
//         },
//         limits: { fileSize: MAX_FILE_SIZE }, // 5MB
//     });


// // file-upload.utils.ts
// import { FileInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { join } from 'path';
// import { existsSync, mkdirSync } from 'fs';
// import { BadRequestException } from '@nestjs/common';
// import { allowedMimeTypes, MAX_FILE_SIZE } from './file-upload.config';
// import { UploadFolder } from 'src/common/enums/file-upload.enum';

// export const getDiskStorage = (folder: UploadFolder) =>
//     diskStorage({
//         destination: (req, file, cb) => {
//             const uploadPath = join(__dirname, '../../uploads', folder);
//             if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
//             cb(null, uploadPath);
//         },
//         filename: (req, file, cb) => {
//             cb(null, `${Date.now()}-${file.originalname}`);
//         },
//     });

// export const getFileInterceptor = (fieldName: string, folder: UploadFolder) =>
//     FileInterceptor(fieldName, {
//         storage: getDiskStorage(folder),
//         fileFilter: (req, file, cb) => {
//             const allowed = allowedMimeTypes[folder];
//             if (!allowed.includes(file.mimetype)) {
//                 return cb(
//                     new BadRequestException(
//                         `Invalid file type for ${folder}. Allowed: ${allowed.join(', ')}`,
//                     ),
//                     false,
//                 );
//             }
//             cb(null, true);
//         },
//         limits: { fileSize: MAX_FILE_SIZE }, // 5MB or whatever you set
//     });

import {
    FileInterceptor,
    FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { allowedMimeTypes, MAX_FILE_SIZE } from './file-upload.config';
import { UploadFolder } from 'src/common/enums/file-upload.enum';

// Reusable disk storage generator
export const getDiskStorage = (folder: UploadFolder) =>
    diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = join(__dirname, '../../uploads', folder);
            if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        },
    });

// Common file filter
const makeFileFilter = (folder: UploadFolder) => {
    return (req, file, cb) => {
        const allowed = allowedMimeTypes[folder];
        if (!allowed.includes(file.mimetype)) {
            return cb(
                new BadRequestException(
                    `Invalid file type for ${folder}. Allowed: ${allowed.join(', ')}`,
                ),
                false,
            );
        }
        cb(null, true);
    };
};

/**
 * For **single file uploads**
 */
export const getFileInterceptor = (
    fieldName: string,
    folder: UploadFolder,
) =>
    FileInterceptor(fieldName, {
        storage: getDiskStorage(folder),
        fileFilter: makeFileFilter(folder),
        limits: { fileSize: MAX_FILE_SIZE },
    });

/**
 * For **multi-field uploads** (e.g. logo + requiredDocuments)
 * Pass an array of `{ name, folder, maxCount }`
 */
export const getFilesInterceptor = (
    fields: { name: string; folder: UploadFolder; maxCount?: number }[],
) => {
    return FileFieldsInterceptor(
        fields.map((f) => ({
            name: f.name,
            maxCount: f.maxCount ?? 1,
        })),
        {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const field = fields.find((f) => f.name === file.fieldname);
                    if (!field) {
                        return cb(new BadRequestException(`Unexpected field: ${file.fieldname}`), '');
                    }
                    const uploadPath = join(__dirname, '../../uploads', field.folder);
                    if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
                    cb(null, uploadPath);
                },
                filename: (req, file, cb) => {
                    cb(null, `${Date.now()}-${file.originalname}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                const field = fields.find((f) => f.name === file.fieldname);
                if (!field) {
                    return cb(new BadRequestException(`Unexpected field: ${file.fieldname}`), false);
                }
                const allowed = allowedMimeTypes[field.folder];
                if (!allowed.includes(file.mimetype)) {
                    return cb(
                        new BadRequestException(
                            `Invalid file type for ${field.name}. Allowed: ${allowed.join(', ')}`,
                        ),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: { fileSize: MAX_FILE_SIZE },
        },
    );
};
