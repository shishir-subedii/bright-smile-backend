import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/auth/AuthRoles';
import { UserRole } from 'src/common/enums/auth-roles.enum';
import { JwtAuthGuard } from 'src/common/auth/AuthGuard';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
@ApiTags('Doctors')
@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) { }

  /*
   Create doctor
  */
  @ApiOperation({ summary: 'Create a new doctor' })
  @ApiResponse({ status: 201, description: 'Doctor created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @Post()
  async create(@Body() createDoctorDto: CreateDoctorDto) {
    const doctor = await this.doctorService.create(createDoctorDto);
    return {
      success: true,
      message: 'Doctor created successfully',
      data: doctor,
    };
  }

  /*
   Get all doctors
  */
  @ApiOperation({ summary: 'Get all doctors' })
  @ApiResponse({ status: 200, description: 'Doctors retrieved successfully' })
  @Get()
  async findAll() {
    const doctors = await this.doctorService.findAll();
    return {
      success: true,
      message: 'Doctors retrieved successfully',
      data: doctors,
    };
  }

  /*
   Get doctor by id
  */
  @ApiOperation({ summary: 'Get doctor by ID' })
  @ApiResponse({ status: 200, description: 'Doctor retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Doctor not found' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const doctor = await this.doctorService.findOne(id);
    return {
      success: true,
      message: 'Doctor retrieved successfully',
      data: doctor,
    };
  }

  /*
   Update doctor
  */
  @ApiOperation({ summary: 'Update doctor by ID' })
  @ApiResponse({ status: 200, description: 'Doctor updated successfully' })
  @ApiBadRequestResponse({ description: 'Doctor not found or invalid input' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    const doctor = await this.doctorService.update(id, updateDoctorDto);
    return {
      success: true,
      message: 'Doctor updated successfully',
      data: doctor,
    };
  }

  /*
   Delete doctor
  */
  @ApiOperation({ summary: 'Delete doctor by ID' })
  @ApiResponse({ status: 200, description: 'Doctor deleted successfully' })
  @ApiBadRequestResponse({ description: 'Doctor not found' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.doctorService.remove(id);
    return {
      success: true,
      message: 'Doctor deleted successfully',
    };
  }
}
