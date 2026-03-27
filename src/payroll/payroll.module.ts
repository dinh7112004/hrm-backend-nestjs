import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { Payroll, PayrollSchema } from './schemas/payroll.schema';
import { PayrollAdjustment, PayrollAdjustmentSchema } from './schemas/adjustment.schema'; // Import thêm cái này sếp nhé
import { AttendanceModule } from '../attendance/attendance.module';
import { UsersModule } from '../user/users.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Payroll.name, schema: PayrollSchema },
            { name: PayrollAdjustment.name, schema: PayrollAdjustmentSchema } // <--- PHẢI CÓ DÒNG NÀY Ở ĐÂY
        ]),
        AttendanceModule,
        UsersModule,
    ],
    controllers: [PayrollController],
    providers: [PayrollService],
    exports: [PayrollService],
})
export class PayrollModule { }