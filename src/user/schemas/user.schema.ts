import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ required: true, unique: true })
    userId: string; // Chứa giá trị như "Nv3", "3", "5"...

    @Prop({ required: true })
    password: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    phone: string; // Dùng để login từ App

    @Prop()
    position: string;

    @Prop()
    dept: string;

    @Prop({ default: null })
    deviceId: string; // Lưu ID thiết bị để định danh máy

    @Prop({ default: true })
    isActive: boolean; // Trạng thái hoạt động (Dùng cho nghỉ việc)

    @Prop({ default: null })
    pushToken: string; // Thêm trường này để lưu mã gửi thông báo của Expo
    @Prop({ default: 0 })
    baseSalary: number;

    @Prop({ default: 96 }) // Tổng phép tính theo giờ (12 ngày * 8h = 96h)
    leaveBalance: number;
}

export const UserSchema = SchemaFactory.createForClass(User);   