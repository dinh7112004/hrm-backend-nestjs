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

    async createMessage(
        senderId: string,
        receiverId: string,
        text: string,
        isAdmin: boolean,
        fileData: { fileUrl: string; fileName: string; fileType: string } | null = null // Thêm tham số
    ) {
        const newMessage = new this.messageModel({
            senderId,
            receiverId,
            text,
            isAdmin,
            ...(fileData && fileData) // Nối data file vào nếu có
        });
        const savedMessage = await newMessage.save();

        let notifText = text || '📁 Đã gửi một tệp đính kèm';
        try {
            if (isAdmin) {
                await this.notificationsService.create({
                    userId: receiverId,
                    senderId: senderId,
                    messageId: savedMessage._id.toString(), // <--- ĐÃ CHÈN DÒNG NÀY VÀO
                    title: 'Phản hồi từ Quản lý',
                    message: notifText.length > 50 ? notifText.substring(0, 47) + '...' : notifText,
                    type: 'CHAT'
                });
            } else {
                await this.notificationsService.create({
                    userId: 'ADMIN',
                    senderId: senderId,
                    messageId: savedMessage._id.toString(), // <--- ĐÃ CHÈN DÒNG NÀY VÀO
                    title: 'Tin nhắn mới từ nhân viên',
                    message: notifText.length > 50 ? notifText.substring(0, 47) + '...' : notifText,
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
                $or: [{ senderId: employeeId }, { receiverId: employeeId }],
            })
            .sort({ createdAt: 1 })
            .exec();
    }

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
                    lastMessage: lastMsg ? (lastMsg.text || '📁 Tệp đính kèm') : 'Chưa có tin nhắn',
                    lastTime: lastMsg ? lastMsg.createdAt : null,
                    unreadCount: unreadCount,
                };
            })
        );
    }

    async markAsRead(employeeId: string) {
        return this.messageModel.updateMany(
            { senderId: employeeId, isAdmin: false, isRead: false },
            { $set: { isRead: true } }
        );
    }
}