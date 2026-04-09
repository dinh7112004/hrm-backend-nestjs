import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/task.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
        private notificationsService: NotificationsService,
    ) { }

    // Web Admin: Tạo task mới
    async create(createTaskDto: CreateTaskDto): Promise<Task> {
        const newTask = new this.taskModel(createTaskDto);
        const savedTask = await newTask.save();

        try {
            await this.notificationsService.create({
                userId: savedTask.assigneeId,
                title: 'Công việc mới',
                message: `Bạn vừa được giao việc: "${savedTask.title}". Hạn chót: ${new Date(savedTask.dueDate).toLocaleDateString('vi-VN')}`,
                type: 'TASK'
            });
        } catch (error) {
            console.log("Lỗi gửi thông báo giao việc:", error.message);
        }

        return savedTask;
    }

    // Web Admin: Lấy TẤT CẢ task
    async findAll(): Promise<Task[]> {
        return this.taskModel.find().sort({ createdAt: -1 }).exec();
    }

    // App Mobile: Lấy task CỦA RIÊNG MÌNH
    async findByAssignee(assigneeId: string): Promise<Task[]> {
        return this.taskModel.find({ assigneeId }).sort({ dueDate: 1 }).exec();
    }

    // Cập nhật trạng thái Task (App & Web dùng) - Đã sửa để nhận file ảnh và %
    async updateStatus(
        id: string,
        status: string,
        progress?: number,
        proofImage?: string
    ): Promise<Task> {
        const updateData: any = { status };

        if (progress !== undefined && !isNaN(progress)) {
            updateData.progress = progress;
        }

        if (proofImage) {
            updateData.proofImage = proofImage;
        }

        const updatedTask = await this.taskModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedTask) throw new NotFoundException('Không tìm thấy Task!');

        return updatedTask;
    }

    // Web Admin: Xóa task
    async remove(id: string): Promise<any> {
        return this.taskModel.findByIdAndDelete(id);
    }
}