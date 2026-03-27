import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
    // ID của user nhận thông báo (Nếu null thì hiểu là thông báo chung cho toàn hệ thống)
    @Prop({ type: String, required: true })
    userId: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    // Loại thông báo: 'ATTENDANCE', 'LEAVE', 'SYSTEM', 'TASK'...
    @Prop({ required: true, default: 'SYSTEM' })
    type: string;

    // Trạng thái đã đọc chưa
    @Prop({ default: false })
    isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);