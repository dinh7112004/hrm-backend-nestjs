import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { UsersService } from '../user/users.service'; // Thêm import này
import { Expo, ExpoPushMessage } from 'expo-server-sdk'; // Thêm bộ máy Expo

@Injectable()
export class NotificationsService {
    private expo = new Expo(); // Khởi tạo máy bắn Expo
    private readonly logger = new Logger(NotificationsService.name); // Dùng Logger cho pro

    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private readonly usersService: UsersService // Tiêm UsersService vào đây
    ) { }

    // 1. Tạo thông báo mới (Lưu DB + Bắn Ting ting)
    // Tìm đến hàm create và thay thế toàn bộ bằng đoạn này:
    async create(createData: { userId: string; title: string; message: string; type?: string; senderId?: string; messageId?: string }) {
        // A. Lưu thông báo vào Database
        const newNotif = new this.notificationModel(createData);
        const savedNotif = await newNotif.save();

        // B. Bắn Push Notification ra màn hình khóa
        try {
            if (createData.userId !== 'ADMIN') {
                const user = await this.usersService.findOne(createData.userId);

                if (user && user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
                    const messages: ExpoPushMessage[] = [{
                        to: user.pushToken,
                        sound: 'default',
                        title: createData.title,
                        body: createData.message,
                        data: {
                            type: createData.type,
                            senderId: createData.senderId,
                            messageId: createData.messageId,
                            notificationId: savedNotif._id
                        },
                    }];

                    const chunks = this.expo.chunkPushNotifications(messages);
                    for (const chunk of chunks) {
                        await this.expo.sendPushNotificationsAsync(chunk);
                    }
                    this.logger.log(` Đã bắn Push Notification tới: ${user.name}`);
                }
            }
        } catch (error) {
            this.logger.error(`Lỗi khi bắn Push Notification:`, error);
        }

        return savedNotif;
    }

    // 2. Lấy danh sách thông báo của 1 user (Sắp xếp mới nhất lên đầu)
    async findByUserId(userId: string) {
        return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).exec();
    }

    // 3. Đánh dấu 1 thông báo là đã đọc
    async markAsRead(id: string) {
        return this.notificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true });
    }

    // 4. Đánh dấu TẤT CẢ thông báo của user là đã đọc
    async markAllAsRead(userId: string) {
        return this.notificationModel.updateMany({ userId, isRead: false }, { isRead: true });
    }
}