import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    assigneeId: string; // ID của nhân viên được giao việc

    @Prop({ required: true })
    dueDate: Date; // Hạn chót

    @Prop({ default: 'TODO', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'] })
    status: string;

    @Prop({ default: 'MEDIUM', enum: ['LOW', 'MEDIUM', 'HIGH'] })
    priority: string;

    // --- CÁC TRƯỜNG MỚI CHO TÍNH NĂNG BÁO CÁO ---
    @Prop({ default: 0 })
    progress: number; // % hoàn thành (0 - 100)

    @Prop()
    proofImage: string; // Đường dẫn ảnh minh chứng
}

export const TaskSchema = SchemaFactory.createForClass(Task);