import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { ConfigModule } from '../app-config/config.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    // Nhét thêm User vào đây để AttendanceService có thể gọi this.userModel.find()
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: User.name, schema: UserSchema } // <--- DÒNG QUAN TRỌNG NHẤT LÀ ĐÂY Ạ
    ]),

    ConfigModule,
    NotificationsModule,

  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],

  exports: [
    AttendanceService,
    MongooseModule // <--- Đây chính là "chìa khóa" để PayrollService thấy AttendanceModel
  ],
})
export class AttendanceModule { }