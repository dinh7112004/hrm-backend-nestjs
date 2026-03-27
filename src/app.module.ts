import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose'; // Thêm dòng này

import { AppController } from './app.controller';

import { AppService } from './app.service';

import { UsersModule } from './user/users.module';

import { AttendanceModule } from './attendance/attendance.module';
import { ScheduleModule } from '@nestjs/schedule';

import { LeavesModule } from './leaves/leaves.module';
import { TasksModule } from './tasks/tasks.module';
import { MessagesModule } from './messages/messages.module'; // <-- Thêm dòng này
import { ConfigModule } from './app-config/config.module';
import { AdminModule } from './admin/admin.module';
import { PayrollModule } from './payroll/payroll.module';
@Module({

  imports: [

    // Kết nối đến MongoDB (Chạy qua Docker hoặc Local)

    // 'attendance' là tên Database sẽ tự sinh ra

    MongooseModule.forRoot('mongodb+srv://Dinh2004:Dinh2004@cluster0.nn6s5kf.mongodb.net/attendance_db?retryWrites=true&w=majority&appName=Cluster0'),

    UsersModule,

    AttendanceModule,
    LeavesModule,
    TasksModule,
    ConfigModule,
    MessagesModule,
    AdminModule,
    ScheduleModule.forRoot(),
    PayrollModule,
  ],

  controllers: [AppController],

  providers: [AppService],

})

export class AppModule { }