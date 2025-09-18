import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    Req,
    Body,
    UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload/file-upload.service';

import {
    ApiTags,
    ApiConsumes,
    ApiBody,
    ApiResponse,
    ApiOperation,
} from '@nestjs/swagger';
import { getDiskStorage, getFileInterceptor } from './file-upload.utils';
import { MulterExceptionFilter } from 'src/common/filters/multer-exception.filter';
import { UploadFolder } from 'src/common/enums/file-upload.enum';

@ApiTags('File Upload') // groups endpoints in Swagger
@Controller('file-upload')
export class FileuploadController {
    constructor(private readonly fileUploadService: FileUploadService) { }

    @Post('profile')
    @UseInterceptors(getFileInterceptor('file', UploadFolder.PROFILES))
    @UseFilters(MulterExceptionFilter) // handles Multer errors
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload profile picture' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'string', example: '123' },
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
            required: ['userId', 'file'],
        },
    })
    async uploadProfile(
        @UploadedFile() file: Express.Multer.File,
        @Req() req,
        @Body('userId') userId: string,
    ) {
        const fileUrl = this.fileUploadService.getFileUrl(req, file, UploadFolder.PROFILES);

        return {
            success: true,
            statusCode: 201,
            message: 'Profile uploaded successfully',
            data: {
                userId,
                originalName: file.originalname,
                storedName: file.filename,
                mimeType: file.mimetype,
                size: file.size,
                url: fileUrl,
            },
        };
    }

    @Post('application')
    @UseInterceptors(getFileInterceptor('file',UploadFolder.APPLICATIONS))
    @UseFilters(MulterExceptionFilter) // handles Multer errors
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload application document' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'string', example: '123' },
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
            required: ['userId', 'file'],
        },
    })
    async uploadApplication(
        @UploadedFile() file: Express.Multer.File,
        @Req() req,
        @Body('userId') userId: string,
    ) {
        const fileUrl = this.fileUploadService.getFileUrl(req, file, UploadFolder.APPLICATIONS);

        return {
            success: true,
            statusCode: 201,
            message: 'Application uploaded successfully',
            data: {
                userId,
                originalName: file.originalname,
                storedName: file.filename,
                mimeType: file.mimetype,
                size: file.size,
                url: fileUrl,
            },
        };
    }
}


//more usage
/*
 @Post()
  @Roles(UserRole.USER)
  @UseInterceptors(
    getFilesInterceptor([
      { name: 'requiredDocuments', folder: UploadFolder.APPLICATIONS },
      { name: 'logo', folder: UploadFolder.LOGOS },
    ]),
  )
  @UseFilters(MulterExceptionFilter)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit new application with documents & logo' })
  //There can be a better way to document this in swagger. Research later
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        restaurantName: { type: 'string', example: 'Pizza Palace' },
        description: { type: 'string', example: 'Best pizza in town' },
        contactPersonName: { type: 'string', example: 'John Doe' },
        contactEmail: { type: 'string', example: 'owner@pizzapalace.com' },
        contactNumber: { type: 'string', example: '+977-9812345678' },
        registeredCountry: { type: 'string', example: 'Nepal' },
        registeredAddress: { type: 'string', example: 'Pokhara-17' },
        companyEmail: { type: 'string', example: 'info@pizzapalace.com' },
        companyPhone: { type: 'string', example: '+977-9800000000' },
        city: { type: 'string', example: 'Pokhara' },

        // --- New fields ---
        addressDescription: { type: 'string', example: '5th floor, near main gate' },
        latitude: { type: 'number', example: 28.2096 },
        longitude: { type: 'number', example: 83.9856 },

        requiredDocuments: { type: 'string', format: 'binary', description: 'PDF file' },
        logo: { type: 'string', format: 'binary', description: 'JPG/PNG logo' },
      },
      required: [
        'restaurantName',
        'contactPersonName',
        'contactEmail',
        'contactNumber',
        'registeredCountry',
        'registeredAddress',
        'companyEmail',
        'companyPhone',
        'city',
        'addressDescription',
        'latitude',
        'longitude',
        'requiredDocuments',
      ],
    },
  })


  async createApplication(
    @UploadedFiles()
    files: {
      requiredDocuments?: Express.Multer.File[];
      logo?: Express.Multer.File[];
    },
    @Req() req,
    @Body() dto: CreateApplicationDto,
  ) {
    const user = req['user'] as userPayloadType;

    const fileUrl = files.requiredDocuments
      ? this.fileUploadService.getFileUrl(req, files.requiredDocuments[0], UploadFolder.APPLICATIONS)
      : defaultFileName;

    const logoUrl = files.logo
      ? this.fileUploadService.getFileUrl(req, files.logo[0], UploadFolder.LOGOS)
      : defaultFileName;

    const application = await this.applicationService.create(
      user.id,
      dto,
      fileUrl,
      logoUrl,
    );

    return {
      success: true,
      message: 'Application submitted successfully',
      data: application,
    };
  }
*/