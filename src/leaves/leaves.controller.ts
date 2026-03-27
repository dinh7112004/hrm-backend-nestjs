import { Controller, Get, Post, Body, Param, Patch, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { LeavesService } from './leaves.service';

@Controller('leaves')
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) { }

    // API: Nhân viên gửi đơn CÓ KÈM FILE ẢNH
    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/leaves', // Lưu vào thư mục này
            filename: (req, file, cb) => {
                // Đổi tên file để không bị trùng (VD: 1699999999-999.jpg)
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            }
        })
    }))
    create(@Body() createLeaveDto: any, @UploadedFile() file: Express.Multer.File) {
        // Nếu có gửi kèm ảnh, gán đường dẫn ảnh vào dữ liệu lưu xuống DB
        if (file) {
            createLeaveDto.evidence = `/uploads/leaves/${file.filename}`;
        }
        return this.leavesService.create(createLeaveDto);
    }

    // Các API khác giữ nguyên
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