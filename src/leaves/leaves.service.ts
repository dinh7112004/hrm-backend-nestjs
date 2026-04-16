import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Leave } from './schemas/leave.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { DriveService } from './drive.service';
import { User } from '../user/schemas/user.schema';
import * as fs from 'fs';

@Injectable()
export class LeavesService {
    constructor(
        @InjectModel(Leave.name) private leaveModel: Model<Leave>,
        @InjectModel(User.name) private userModel: Model<User>,
        private notificationsService: NotificationsService,
        private driveService: DriveService,
    ) { }

    // 1. Nhân viên tạo đơn xin nghỉ
    async create(createLeaveDto: any, file?: Express.Multer.File) {
        // --- VALIDATION CHỐNG TRÙNG LỊCH NGHỈ ---
        const existingLeaves = await this.leaveModel.find({
            userId: createLeaveDto.userId,
            status: { $in: ['PENDING', 'APPROVED'] }
        });

        const newStart = this.parseDateStr(createLeaveDto.startDate);
        const newEnd = createLeaveDto.endDate ? this.parseDateStr(createLeaveDto.endDate) : new Date(newStart.getTime() + 9 * 60 * 60 * 1000);

        for (const leave of existingLeaves) {
            const oldStart = this.parseDateStr(leave.startDate);
            const oldEnd = leave.endDate ? this.parseDateStr(leave.endDate) : new Date(oldStart.getTime() + 9 * 60 * 60 * 1000);

            if (newStart < oldEnd && newEnd > oldStart) {
                throw new BadRequestException('Trùng lịch: Bạn đã nộp đơn xin nghỉ vào khoảng thời gian này rồi!');
            }
        }

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

    parseDateStr(dateStr: string): Date {
        if (!dateStr) return new Date();
        // 1. Thử parse trực tiếp (Hỗ trợ ISO YYYY-MM-DD...)
        const dObj = new Date(dateStr);
        if (!isNaN(dObj.getTime())) return dObj;

        // 2. Thử parse định dạng DD/MM/YYYY HH:mm
        try {
            const cleanStr = dateStr.replace(/-/g, '/');
            const parts = cleanStr.split(' ');
            const dateParts = parts[0].split('/');
            if (dateParts.length === 3) {
                const [d, m, y] = dateParts;
                const [hh, mm] = parts[1] ? parts[1].split(':') : ['00', '00'];
                const res = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
                if (!isNaN(res.getTime())) return res;
            }
        } catch (e) {}

        console.log("⚠️ Không thể parse ngày tháng:", dateStr);
        return new Date();
    }

    calculateLeaveHours(startStr: string, endStr: string): number {
        const start = this.parseDateStr(startStr);
        let end = start;
        if (endStr) {
            end = this.parseDateStr(endStr);
            if (end < start) end = start;
        } else {
            end = new Date(start);
            end.setHours(17, 30, 0, 0);
        }

        let current = new Date(start);
        let totalHours = 0;

        while (current < end) {
            let dayStart = new Date(current);
            dayStart.setHours(8, 0, 0, 0);
            
            let dayEnd = new Date(current);
            dayEnd.setHours(17, 30, 0, 0);

            if (current.getDay() !== 0) { // Bỏ qua Chủ nhật
                let overlapStart = current > dayStart ? current : dayStart;
                let dayFinish = end < dayEnd ? end : dayEnd;

                if (overlapStart < dayFinish) {
                    let totalMs = dayFinish.getTime() - overlapStart.getTime();

                    // Khoét nghỉ trưa: 12:00 -> 13:30
                    let lunchStart = new Date(current);
                    lunchStart.setHours(12, 0, 0, 0);
                    let lunchEnd = new Date(current);
                    lunchEnd.setHours(13, 30, 0, 0);

                    let overlapLunchStart = overlapStart > lunchStart ? overlapStart : lunchStart;
                    let overlapLunchEnd = dayFinish < lunchEnd ? dayFinish : lunchEnd;

                    if (overlapLunchStart < overlapLunchEnd) {
                        totalMs -= (overlapLunchEnd.getTime() - overlapLunchStart.getTime());
                    }

                    totalHours += totalMs / (1000 * 60 * 60);
                }
            }

            // Chuyển lịch sang 8h sáng ngày hôm sau
            current.setDate(current.getDate() + 1);
            current.setHours(8, 0, 0, 0);
        }
        
        return Math.round(totalHours * 100) / 100;
    }

    // 4. Web Admin: Sếp duyệt hoặc từ chối đơn
    async updateStatus(id: string, status: string) {
        const leaveBefore = await this.leaveModel.findById(id);
        if (!leaveBefore) throw new NotFoundException('Không tìm thấy đơn xin nghỉ');

        let dataToUpdate: any = { status };

        if (status === 'APPROVED' && leaveBefore.status !== 'APPROVED') {
            const leaveHrs = this.calculateLeaveHours(leaveBefore.startDate, leaveBefore.endDate);
            dataToUpdate.durationHours = leaveHrs;

            const user = await this.userModel.findById(leaveBefore.userId);
            if (user) {
                const bal = user.leaveBalance ?? 96; // 96h default
                let paid = leaveHrs;
                let unpaid = 0;

                if (bal >= leaveHrs) {
                    paid = leaveHrs;
                    user.leaveBalance = bal - leaveHrs;
                } else {
                    paid = bal;
                    unpaid = leaveHrs - bal;
                    user.leaveBalance = 0;
                }
                dataToUpdate.paidHours = paid;
                dataToUpdate.unpaidHours = unpaid;
                await user.save();
            }
        } 
        else if (leaveBefore.status === 'APPROVED' && status !== 'APPROVED') {
            // Hoàn phép nếu bị Hủy duyệt
            const user = await this.userModel.findById(leaveBefore.userId);
            if (user) {
                user.leaveBalance = (user.leaveBalance || 0) + (leaveBefore.paidHours || 0);
                await user.save();
            }
            dataToUpdate.paidHours = 0;
            dataToUpdate.unpaidHours = 0;
            dataToUpdate.durationHours = 0;
        }

        const leave = await this.leaveModel.findByIdAndUpdate(
            id,
            dataToUpdate,
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

    async findByUserAndMonth(userId: string, month: string) {
        let startOfMonth: Date;
        let endOfMonth: Date;

        if (month) {
            const [mStr, yStr] = month.split('-');
            const m = parseInt(mStr);
            const y = parseInt(yStr);
            startOfMonth = new Date(y, m - 1, 1);
            endOfMonth = new Date(y, m, 0, 23, 59, 59);
        } else {
            const now = new Date();
            startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }

        const leaves = await this.leaveModel.find({
            userId,
            status: 'APPROVED'
        }).sort({ startDate: 1 }).lean();

        // Lọc và TỰ ĐỘNG TÍNH LẠI nếu bị 0h
        return leaves.filter(l => {
            if (!l.startDate) return false;
            const leaveDate = this.parseDateStr(l.startDate);
            return leaveDate >= startOfMonth && leaveDate <= endOfMonth;
        }).map(l => {
            // Nếu duration hoặc paid = 0, tính lại ngay tại chỗ để trả về cho Frontend
            if ((l.durationHours || 0) === 0) {
                l.durationHours = this.calculateLeaveHours(l.startDate, l.endDate);
                if ((l.paidHours || 0) === 0) l.paidHours = l.durationHours;
            }
            return l;
        });
    }
}