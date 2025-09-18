import { Global, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { multerConfig } from './multer.config';
import { FileUploadService } from './file-upload.service';
import { FileuploadController } from './file-upload.controller';

@Global()
@Module({
  imports: [MulterModule.register(multerConfig)], // config once, available everywhere
  providers: [FileUploadService],
  controllers: [FileuploadController],
  exports: [FileUploadService, MulterModule], // so other modules can use it
})
export class FileUploadModule { }
