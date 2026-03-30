import { Controller, Get, Post, Body, Param, Patch, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { LeavesService } from './leaves.service';

// ⚙️ Cấu hình Cloudinary (Tạm thời sếp có thể hardcode để test, nhưng khuyên sếp nên cho vào file .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Controller('leaves')
export class LeavesController {
    constructor(private readonly leavesService: LeavesService) { }

    // API: Nhân viên gửi đơn CÓ KÈM FILE ẢNH -> BẮN LÊN CLOUD
    @Post()
    @UseInterceptors(FileInterceptor('evidence')) // Không dùng diskStorage nữa, để nó lưu tạm vào RAM (buffer)
    async create(@Body() createLeaveDto: any, @UploadedFile() file: Express.Multer.File) {

        // Nếu có ảnh, bắn lên Cloudinary trước
        if (file) {
            try {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'AppDiemDanh/Leaves' }, // Tự động tạo thư mục này trên Cloudinary
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    // Bắn dữ liệu ảnh (buffer) vào luồng upload
                    streamifier.createReadStream(file.buffer).pipe(uploadStream);
                });

                // Lấy cái link xịn sò từ Cloudinary gán vào DB (VD: https://res.cloudinary.com/...)
                createLeaveDto.evidence = (uploadResult as any).secure_url;
            } catch (error) {
                console.error("Lỗi upload ảnh:", error);
                throw new HttpException('Không thể upload ảnh minh chứng', HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }

        // Lưu thông tin đơn (kèm cái link ảnh mới) xuống DB
        return this.leavesService.create(createLeaveDto);
    }

    // ============================================
    // CÁC API DƯỚI NÀY EM GIỮ NGUYÊN CODE CỦA SẾP
    // ============================================
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