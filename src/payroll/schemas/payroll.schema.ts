// /src/payroll/schemas/payroll.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Payroll extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    month: string; // Định dạng "MM-YYYY"

    @Prop({ default: 0 })
    baseSalary: number; // Lương thỏa thuận

    @Prop({ default: 0 })
    actualWorkDays: number; // Số ngày đi làm thực tế (lấy từ attendance)

    @Prop({ default: 26 })
    standardWorkDays: number; // Ngày công chuẩn (thường là 26)

    @Prop({ default: 0 })
    bonus: number; // Thưởng

    @Prop({ default: [] })
    bonusDetails: { reason: string, amount: number, date: Date }[];

    @Prop({ default: 0 })
    fine: number; // Phạt

    @Prop({ default: [] })
    fineDetails: { reason: string, amount: number, date: Date }[];

    @Prop({ default: 0 })
    allowance: number; // Phụ cấp

    @Prop({ default: 0 })
    netSalary: number; // Lương thực nhận theo giờ làm

    @Prop({ default: 0 })
    netSalaryFull: number; // Lương thực nhận theo lương cơ bản (Full)

    @Prop()
    actualWorkHours: number; // Thêm trường này để lưu tổng số giờ

    @Prop({ default: 'PENDING', enum: ['PENDING', 'CHECKED', 'PAID'] })
    status: string; // Trạng thái: Chờ duyệt, Đã kiểm tra, Đã thanh toán
}


export const PayrollSchema = SchemaFactory.createForClass(Payroll);