import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { Leave, LeaveSchema } from './schemas/leave.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { DriveService } from './drive.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: Leave.name, schema: LeaveSchema }]),
        NotificationsModule,
    ],
    controllers: [LeavesController],
    providers: [LeavesService, DriveService],
})
export class LeavesModule { }