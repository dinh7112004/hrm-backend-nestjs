import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessagesGateway } from './messages.gateway';
import { NotificationsModule } from '../notifications/notifications.module'; // Thêm dòng này

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
        NotificationsModule, // <--- BẮT BUỘC PHẢI CÓ DÒNG NÀY
    ],
    controllers: [MessagesController],
    providers: [MessagesService, MessagesGateway],
})
export class MessagesModule { }