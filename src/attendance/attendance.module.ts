import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { ConfigModule } from '../app-config/config.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import { PayrollModule } from '../payroll/payroll.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: User.name, schema: UserSchema }
    ]),
    ConfigModule,
    NotificationsModule,
    forwardRef(() => PayrollModule),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [
    AttendanceService,
    MongooseModule
  ],
})
export class AttendanceModule { }