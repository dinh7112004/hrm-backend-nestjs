import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { Leave, LeaveSchema } from './schemas/leave.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { DriveService } from './drive.service';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Leave.name, schema: LeaveSchema },
            { name: User.name, schema: UserSchema }
        ]),
        NotificationsModule,
    ],
    controllers: [LeavesController],
    providers: [LeavesService, DriveService],
})
export class LeavesModule { }