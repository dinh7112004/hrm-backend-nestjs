import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
    @Prop({ required: true }) // Dùng String để nhận được cả "7", "admin", "Nv1"...
    senderId: string;

    @Prop({ required: true })
    receiverId: string;

    @Prop({ required: true })
    text: string;

    @Prop({ default: false })
    isAdmin: boolean;

    @Prop({ default: false })
    isRead: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);