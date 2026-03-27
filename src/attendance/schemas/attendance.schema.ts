import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

@Schema({ timestamps: true })
export class Attendance extends Document {
    // QUAN TRỌNG: Khai báo ref: 'User' để dùng được populate
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: User;

    @Prop()
    ipAddress: string;

    @Prop()
    type: string; // 'OFFICE' hoặc 'REMOTE'

    @Prop({ default: 'PENDING' })
    status: string; // 'APPROVED' hoặc 'PENDING'

    @Prop()
    note: string;

    @Prop()
    checkInTime: Date;

    @Prop()
    checkOutTime: Date;

    @Prop()
    distance: number; // Lưu khoảng cách mét từ app gửi lên

    @Prop()
    adminReply: string; // Lời nhắn phản hồi của Sếp
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);