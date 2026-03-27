import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { Leave, LeaveSchema } from './schemas/leave.schema';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({
    imports: [MongooseModule.forFeature([{ name: Leave.name, schema: LeaveSchema }]),
        NotificationsModule,
    ],
    controllers: [LeavesController],
    providers: [LeavesService],
})
export class LeavesModule { }