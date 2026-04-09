import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs'; // THÊM THƯ VIỆN NÀY ĐỂ XÓA FILE TẠM
import { LeavesService } from './leaves.service';
import { DriveService } from './drive.service';

@Controller('leaves')
export class LeavesController {
  constructor(
    private readonly leavesService: LeavesService,
    private readonly driveService: DriveService,
  ) { }

  @Post()
  @UseInterceptors(FileInterceptor('evidence', {
    storage: diskStorage({
      destination: './uploads/leaves',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname) || '.jpg';
        callback(null, `${uniqueSuffix}${ext}`);
      }
    })
  }))
  async create(
    @Body() createLeaveDto: CreateLeaveDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      try {
        // 1. Up ảnh lên Google Drive
        const driveUrl = await this.driveService.uploadFile(
          file.path,
          file.originalname,
          file.mimetype,
        );

        // 2. Lấy link Drive gán vào data lưu DB
        createLeaveDto.evidence = driveUrl || `/uploads/leaves/${file.filename}`;

        // 3. QUAN TRỌNG: Xóa file tạm ở máy chủ đi cho đỡ nặng ổ cứng
        if (driveUrl && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log(' Đã xóa file rác sau khi up Drive:', file.filename);
        }
      } catch (error) {
        console.error(" Lỗi up ảnh lên Drive:", error);
        // Nếu Drive sập tạm thời thì vẫn giữ link local làm backup
        createLeaveDto.evidence = `/uploads/leaves/${file.filename}`;
      }
    }

    return this.leavesService.create(createLeaveDto);
  }

  @Get()
  findAll() {
    return this.leavesService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.leavesService.findByUser(userId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.leavesService.updateStatus(id, status);
  }
}

interface CreateLeaveDto {
  evidence?: string;
  [key: string]: any;
}