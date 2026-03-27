import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskSchema } from './schemas/task.schema';
import { NotificationsModule } from '../notifications/notifications.module'; // <--- 1. IMPORT VÀO

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
        NotificationsModule, // <--- 2. KHAI BÁO VÀO ĐÂY
    ],
    controllers: [TasksController],
    providers: [TasksService],
})
export class TasksModule { }