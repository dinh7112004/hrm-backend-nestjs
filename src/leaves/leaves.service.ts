import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Leave } from './schemas/leave.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeavesService {
    constructor(
        @InjectModel(Leave.name) private leaveModel: Model<Leave>,
        private notificationsService: NotificationsService, // Tiêm máy bắn thông báo
    ) { }

    // 1. Nhân viên tạo đơn xin nghỉ
    async create(createLeaveDto: any) {
        // Lưu đơn vào database
        const newLeave = new this.leaveModel(createLeaveDto);
        const saved = await (await newLeave.save()).populate('userId', 'name');

        // TỰ ĐỘNG BẮN THÔNG BÁO CHO CẢ 2 BÊN
        try {
            const formattedDate = new Date(saved.startDate).toLocaleDateString('vi-VN');

            // --- VẾ 1: Bắn cho NHÂN VIÊN (Người gửi đơn) ---
            await this.notificationsService.create({
                userId: String(saved.userId._id || saved.userId),
                title: ' Đã gửi đơn nghỉ phép',
                message: `Đơn xin nghỉ ngày ${formattedDate} đã được gửi thành công. Đang chờ sếp duyệt nhé!`,
                type: 'LEAVE'
            });

            // --- VẾ 2: Bắn cho ADMIN (Để hiện lên quả chuông Web Admin) ---
            // Sếp lưu ý: saved.userId.name chỉ có nếu populate thành công, 
            // nếu không sếp có thể dùng createLeaveDto.userName nếu sếp có gửi kèm từ App
            const empName = (saved.userId as any)?.name || "Một nhân viên";

            await this.notificationsService.create({
                userId: 'ADMIN', // Quy ước chung để hiện lên chuông Web Admin
                title: ' Có đơn xin nghỉ mới',
                message: `${empName} vừa gửi đơn xin nghỉ ngày ${formattedDate}. Click để xem chi tiết!`,
                type: 'LEAVE'
            });

            console.log(" Đã bắn thông báo cho cả Nhân viên và Admin thành công!");
        } catch (e) {
            console.log(" Lỗi gửi thông báo khi tạo đơn:", e.message);
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

        // TỰ ĐỘNG BẮN THÔNG BÁO TRẢ KẾT QUẢ CHO NHÂN VIÊN
        try {
            const statusText = status === 'APPROVED' ? 'được CHẤP THUẬN ' : 'bị TỪ CHỐI ';
            const dateObj = new Date(leave.startDate);
            const formattedDate = !isNaN(dateObj.getTime())
                ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`
                : "đã chọn";

            await this.notificationsService.create({
                userId: String(leave.userId._id || leave.userId),
                title: ' Kết quả duyệt đơn nghỉ',
                message: `Đơn nghỉ ngày ${formattedDate} của bạn đã ${statusText}.`,
                type: 'LEAVE'
            });

            console.log(` Đã báo tin kết quả duyệt cho nhân viên ${leave.userId}`);
        } catch (e) {
            console.log(" Lỗi gửi thông báo cập nhật trạng thái:", e.message);
        }

        return leave;
    }
}