import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
    @Prop({ required: true })
    senderId: string;

    @Prop({ required: true })
    receiverId: string;

    @Prop({ default: '' }) // Cho phép text rỗng nếu chỉ gửi file
    text: string;

    @Prop({ default: false })
    isAdmin: boolean;

    @Prop({ default: false })
    isRead: boolean;

    // --- THÊM TRƯỜNG LƯU FILE ---
    @Prop({ required: false })
    fileUrl?: string;

    @Prop({ required: false })
    fileName?: string;

    @Prop({ required: false })
    fileType?: string;

    createdAt?: Date;
    updatedAt?: Date;


}

export const MessageSchema = SchemaFactory.createForClass(Message);