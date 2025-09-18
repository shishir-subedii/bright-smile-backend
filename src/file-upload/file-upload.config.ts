import { UploadFolder } from "src/common/enums/file-upload.enum";

export const allowedMimeTypes: Record<UploadFolder, string[]> = {
    [UploadFolder.PROFILES]: ['image/jpeg', 'image/png', 'image/jpg'],
    [UploadFolder.APPLICATIONS]: ['application/pdf'],
    [UploadFolder.COMMON]: ['image/jpeg', 'image/png', 'application/pdf'],
    [UploadFolder.LOGOS]: ['image/jpeg', 'image/jpg', 'image/png'],
};

// file-upload.config.ts
export const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) * 1024 * 1024 || 5 * 1024 * 1024;
