import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { Payroll, PayrollSchema } from './schemas/payroll.schema';
import { PayrollAdjustment, PayrollAdjustmentSchema } from './schemas/adjustment.schema';
import { AttendanceModule } from '../attendance/attendance.module';
import { UsersModule } from '../user/users.module';

// IMPORT 2 SCHEMA MỚI ĐỂ TÍNH PHÉP VÀ LẤY GIỜ LÀM
import { Leave, LeaveSchema } from '../leaves/schemas/leave.schema';
import { AppConfig, AppConfigSchema } from '../app-config/schemas/config.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Payroll.name, schema: PayrollSchema },
            { name: PayrollAdjustment.name, schema: PayrollAdjustmentSchema },
            { name: Leave.name, schema: LeaveSchema },       // <--- THÊM BẢNG NGHỈ PHÉP
            { name: AppConfig.name, schema: AppConfigSchema } // <--- THÊM BẢNG CẤU HÌNH
        ]),
        AttendanceModule,
        UsersModule,
    ],
    controllers: [PayrollController],
    providers: [PayrollService],
    exports: [PayrollService],
})
export class PayrollModule { }