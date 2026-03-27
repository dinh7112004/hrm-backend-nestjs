import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
    constructor(
        @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
        private notificationsService: NotificationsService,
    ) { }

    async createMessage(senderId: string, receiverId: string, text: string, isAdmin: boolean) {
        // 1. Lưu tin nhắn vào Database
        const newMessage = new this.messageModel({ senderId, receiverId, text, isAdmin });
        const savedMessage = await newMessage.save();

        // 2. TỰ ĐỘNG BẮN THÔNG BÁO (PUSH)
        try {
            if (isAdmin) {
                // --- TRƯỜNG HỢP: ADMIN NHẮN CHO NHÂN VIÊN ---
                // Gửi thông báo đến App của nhân viên (receiverId cụ thể)
                await this.notificationsService.create({
                    userId: receiverId,
                    title: '💬 Phản hồi từ Quản lý',
                    message: text.length > 50 ? text.substring(0, 47) + '...' : text,
                    type: 'CHAT'
                });
            } else {
                // --- TRƯỜNG HỢP: NHÂN VIÊN NHẮN CHO ADMIN ---
                // Gửi thông báo lên quả chuông trên Web Admin (dùng quy ước 'ADMIN')
                await this.notificationsService.create({
                    userId: 'ADMIN',
                    title: '💬 Tin nhắn mới từ nhân viên',
                    message: text.length > 50 ? text.substring(0, 47) + '...' : text,
                    type: 'CHAT'
                });
            }
        } catch (e) {
            console.log("❌ Lỗi bắn thông báo Chat:", e.message);
        }

        return savedMessage;
    }

    async getMessages(employeeId: string) {
        return this.messageModel
            .find({
                $or: [
                    { senderId: employeeId },
                    { receiverId: employeeId },
                ],
            })
            .sort({ createdAt: 1 })
            .exec();
    }

    // --- HÀM MỚI 1: Lấy tin cuối và đếm số tin chưa đọc cho danh sách bên trái ---
    async getSummaryForEmployees(employeeIds: string[]) {
        return Promise.all(
            employeeIds.map(async (id) => {
                const lastMsg = await this.messageModel
                    .findOne({ $or: [{ senderId: id }, { receiverId: id }] })
                    .sort({ createdAt: -1 })
                    .exec();

                const unreadCount = await this.messageModel.countDocuments({
                    senderId: id,
                    isAdmin: false,
                    isRead: false,
                });

                return {
                    employeeId: id,
                    lastMessage: lastMsg ? lastMsg.text : 'Chưa có tin nhắn',
                    lastTime: lastMsg ? lastMsg.createdAt : null,
                    unreadCount: unreadCount,
                };
            })
        );
    }

    // --- HÀM MỚI 2: Đánh dấu đã đọc khi Admin bấm vào xem chat ---
    async markAsRead(employeeId: string) {
        return this.messageModel.updateMany(
            { senderId: employeeId, isAdmin: false, isRead: false },
            { $set: { isRead: true } }
        );
    }
}