import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

@Schema({ timestamps: true })
export class Leave extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: User;

    @Prop({ required: true })
    leaveType: string; // THÊM MỚI: Loại nghỉ (ANNUAL, SICK, PERSONAL)

    @Prop({ required: true })
    startDate: string;

    @Prop({ required: false }) // Có thể gửi về rỗng nếu chỉ nghỉ 1 ngày
    endDate: string;

    @Prop({ required: true })
    reason: string;

    @Prop({ required: false })
    evidence: string; // THÊM MỚI: Đường dẫn ảnh minh chứng

    @Prop({ default: 'PENDING' })
    status: string;
}

export const LeaveSchema = SchemaFactory.createForClass(Leave);