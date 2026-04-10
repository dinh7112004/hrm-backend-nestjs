import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Leave } from './schemas/leave.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { DriveService } from './drive.service';
import * as fs from 'fs';

@Injectable()
export class LeavesService {
    constructor(
        @InjectModel(Leave.name) private leaveModel: Model<Leave>,
        private notificationsService: NotificationsService,
        private driveService: DriveService,
    ) { }

    // 1. Nhân viên tạo đơn xin nghỉ
    async create(createLeaveDto: any, file?: Express.Multer.File) {
        // --- XỬ LÝ UPLOAD ẢNH LÊN GOOGLE DRIVE ---
        if (file) {
            try {
                // Đẩy lên Drive và nhận về cái LINK (dạng string)
                const driveLink = await this.driveService.uploadFile(
                    file.path,
                    file.originalname,
                    file.mimetype
                );

                if (driveLink) {
                    // Gán thẳng link vào field evidence (Khớp với Controller và Schema của ông)
                    createLeaveDto.evidence = driveLink;
                    

                    // Xóa file tạm ở thư mục uploads/ trên server Render
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                    console.log("✅ Đã đẩy ảnh lên Drive và dọn dẹp file tạm!");
                }
            } catch (error) {
                console.error("❌ Lỗi upload Google Drive:", error.message);
                // Nếu lỗi, link local vẫn tồn tại trong DTO từ lúc ở Controller
            }
        }

        // Lưu đơn vào database
        const newLeave = new this.leaveModel(createLeaveDto);
        const saved = await (await newLeave.save()).populate('userId', 'name');

        // TỰ ĐỘNG BẮN THÔNG BÁO CHO CẢ 2 BÊN
        try {
            const formattedDate = new Date(saved.startDate).toLocaleDateString('vi-VN');

            // Bắn cho Nhân viên
            await this.notificationsService.create({
                userId: String(saved.userId._id || saved.userId),
                title: 'Đã gửi đơn nghỉ phép',
                message: `Đơn xin nghỉ ngày ${formattedDate} đã được gửi thành công. Đang chờ sếp duyệt nhé!`,
                type: 'LEAVE'
            });

            // Bắn cho Admin
            const empName = (saved.userId as any)?.name || "Một nhân viên";
            await this.notificationsService.create({
                userId: 'ADMIN',
                title: 'Có đơn xin nghỉ mới',
                message: `${empName} vừa gửi đơn xin nghỉ ngày ${formattedDate}. Click để xem chi tiết!`,
                type: 'LEAVE'
            });

            console.log("🚀 Đã bắn thông báo thành công!");
        } catch (e) {
            console.log("⚠️ Lỗi gửi thông báo:", e.message);
        }

        return saved;
    }

    // 2. App: Lấy lịch sử xin nghỉ của 1 nhân viên
    async findByUser(userId: string) {
        return this.leaveModel.find({ userId }).sort({ createdAt: -1 }).exec();
    }

    // 3. Web Admin: Lấy TẤT CẢ đơn xin nghỉ của cả công ty
    async findAll() {
        return this.leaveModel.find().populate('userId', 'name').sort({ createdAt: -1 }).exec();
    }

    // 4. Web Admin: Sếp duyệt hoặc từ chối đơn
    async updateStatus(id: string, status: string) {
        const leave = await this.leaveModel.findByIdAndUpdate(
            id,
            { status },
            { returnDocument: 'after' }
        ).populate('userId', 'name');

        if (!leave) throw new NotFoundException('Không tìm thấy đơn xin nghỉ');

        try {
            const statusText = status === 'APPROVED' ? 'được CHẤP THUẬN ' : 'bị TỪ CHỐI ';
            const dateObj = new Date(leave.startDate);
            const formattedDate = !isNaN(dateObj.getTime())
                ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`
                : "đã chọn";

            await this.notificationsService.create({
                userId: String(leave.userId._id || leave.userId),
                title: 'Kết quả duyệt đơn nghỉ',
                message: `Đơn nghỉ ngày ${formattedDate} của bạn đã ${statusText}.`,
                type: 'LEAVE'
            });
        } catch (e) {
            console.log("⚠️ Lỗi gửi thông báo kết quả duyệt:", e.message);
        }

        return leave;
    }
}