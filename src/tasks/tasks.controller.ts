import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/task.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    create(@Body() createTaskDto: CreateTaskDto) {
        return this.tasksService.create(createTaskDto);
    }

    @Get()
    findAll() {
        return this.tasksService.findAll();
    }

    @Get('user/:assigneeId')
    findByAssignee(@Param('assigneeId') assigneeId: string) {
        return this.tasksService.findByAssignee(assigneeId);
    }

    // ĐÃ SỬA: Hứng form-data chứa file ảnh và text
    @Patch(':id/status')
    @UseInterceptors(
        FileInterceptor('proofImage', {
            storage: diskStorage({
                destination: './uploads', // Thư mục lưu ảnh
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    cb(null, `task-proof-${uniqueSuffix}${ext}`);
                },
            }),
        }),
    )
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Body('progress') progress: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        // Tạo URL ảnh, khớp với cách config static file trong main.ts của bạn
        const imageUrl = file ? `uploads/${file.filename}` : undefined;
        const parsedProgress = progress ? parseInt(progress, 10) : undefined;

        return this.tasksService.updateStatus(id, status, parsedProgress, imageUrl);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tasksService.remove(id);
    }
}