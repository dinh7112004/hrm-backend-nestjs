import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs/promises';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';

// Dùng require cho an toàn với TypeScript trong NestJS
const heicConvert = require('heic-convert');

@Controller('messages')
export class MessagesController {
    constructor(
        private readonly messagesService: MessagesService,
        private readonly messagesGateway: MessagesGateway,
    ) { }

    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/messages', // Nhớ tạo thư mục này nhé
            filename: (req, file, cb) => {
                // Tạo tên file ngẫu nhiên để không bị trùng
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + extname(file.originalname));
            }
        }),
        limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn tệp 10MB
    }))
    async sendMessage(
        @Body('senderId') senderId: string,
        @Body('receiverId') receiverId: string,
        @Body('text') text: string,
        @Body('isAdmin') isAdmin: string, // Từ FormData gửi lên sẽ là chuỗi 'true'/'false'
        @UploadedFile() file: Express.Multer.File,
    ) {
        const isAdminBool = isAdmin === 'true';
        let fileData: { fileUrl: string; fileName: string; fileType: string } | null = null;

        if (file) {
            let finalFilename = file.filename;
            let finalOriginalName = file.originalname;
            let finalMimeType = file.mimetype;

            // Kiểm tra xem file có phải là HEIC/HEIF từ iPhone không
            const ext = extname(file.originalname).toLowerCase();
            if (ext === '.heic' || ext === '.heif') {
                const inputPath = file.path;
                // Đổi đuôi tên file sang .jpg
                const newFilename = file.filename.replace(/\.(heic|heif)$/i, '.jpg');
                const outputPath = join(file.destination, newFilename);

                try {
                    // Đọc file HEIC lên
                    const inputBuffer = await fs.readFile(inputPath);

                    // Convert sang JPG
                    const outputBuffer = await heicConvert({
                        buffer: inputBuffer,
                        format: 'JPEG',
                        quality: 0.8 // Chất lượng 80% cho nhẹ
                    });

                    // Lưu file JPG mới xuống ổ cứng
                    await fs.writeFile(outputPath, Buffer.from(outputBuffer));

                    // Xoá file HEIC cũ đi cho đỡ tốn dung lượng Server
                    await fs.unlink(inputPath);

                    // Cập nhật lại thông tin để lưu vào Database
                    finalFilename = newFilename;
                    finalOriginalName = file.originalname.replace(/\.(heic|heif)$/i, '.jpg');
                    finalMimeType = 'image/jpeg';
                } catch (error) {
                    console.error("❌ Lỗi khi convert HEIC sang JPG trên Server:", error);
                    // Nếu lỗi thì nó vẫn giữ nguyên file HEIC (fallback)
                }
            }

            fileData = {
                fileUrl: `/uploads/messages/${finalFilename}`,
                fileName: finalOriginalName,
                fileType: finalMimeType,
            };
        }

        const savedMessage = await this.messagesService.createMessage(
            senderId,
            receiverId,
            text || '', // Nếu chỉ gửi file thì text = ''
            isAdminBool,
            fileData
        );

        if (isAdminBool) {
            this.messagesGateway.emitToUser(receiverId, savedMessage);
            this.messagesGateway.server.to('admins').emit('receiveMessage', savedMessage);
        } else {
            this.messagesGateway.server.to('admins').emit('receiveMessage', savedMessage);
        }

        return savedMessage;
    }

    @Get(':employeeId')
    async getChatHistory(@Param('employeeId') employeeId: string) {
        if (!employeeId || employeeId === 'undefined' || employeeId === 'null') return [];
        return this.messagesService.getMessages(employeeId);
    }

    @Get('admin/summary')
    async getSummary(@Query('ids') ids: string) {
        if (!ids) return [];
        const idArray = ids.split(',');
        return this.messagesService.getSummaryForEmployees(idArray);
    }

    @Post('read/:employeeId')
    async readMessages(@Param('employeeId') employeeId: string) {
        await this.messagesService.markAsRead(employeeId);
        return { success: true };
    }
}