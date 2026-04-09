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
import { LeavesService } from './leaves.service';

@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) { }

  @Post()
  @UseInterceptors(FileInterceptor('evidence', { // 'evidence' phải khớp với tên field từ App gửi lên
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
    @Body() createLeaveDto: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Chỉ đơn giản là đẩy sang Service xử lý, không viết logic upload ở đây
    return this.leavesService.create(createLeaveDto, file);
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