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

    @Prop({ default: 0 })
    fine: number; // Phạt

    @Prop({ default: 0 })
    allowance: number; // Phụ cấp

    @Prop({ default: 0 })
    netSalary: number; // Lương thực nhận cuối cùng
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);