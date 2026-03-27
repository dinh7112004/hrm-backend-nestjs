// /src/payroll/schemas/adjustment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PayrollAdjustment extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true, enum: ['BONUS', 'FINE'] })
    type: string; // BONUS (Thưởng) hoặc FINE (Phạt)

    @Prop({ required: true })
    amount: number; // Số tiền

    @Prop()
    reason: string; // Lý do: "Thưởng doanh số", "Phạt đi muộn", "Hỗ trợ xăng xe"...

    @Prop({ required: true })
    date: Date; // Ngày ghi nhận (để biết nó thuộc tháng nào)
}

export const PayrollAdjustmentSchema = SchemaFactory.createForClass(PayrollAdjustment);