import { Injectable } from '@nestjs/common';

@Injectable()
export class FileUploadService {
  getFileUrl(req: any, file: Express.Multer.File, folder?: string): string {
    return `${req.protocol}://${req.get('host')}/uploads/${folder || req.params?.folder || 'common'}/${file.filename}`;
  }
}
