import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Attendance } from './schemas/attendance.schema';
import { ConfigService } from '../app-config/config.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../user/schemas/user.schema';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
        @InjectModel(User.name) private userModel: Model<User>,
        private configService: ConfigService,
        private notificationsService: NotificationsService,
    ) { }

    private getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async checkIn(userId: string, ip: string, distance?: number, locationType?: string, note?: string, status?: string, userLat?: number, userLon?: number) {
        if (locationType === 'OFFICE' && userLat && userLon) {
            const config = await this.configService.getConfig();
            const realDistance = this.getDistance(userLat, userLon, config.latitude, config.longitude);

            if (realDistance > config.radius) {
                throw new ForbiddenException(`Gian lận vị trí! Bạn đang cách văn phòng ${Math.round(realDistance)}m`);
            }
        }

        const newRecord = new this.attendanceModel({
            userId,
            ipAddress: ip,
            type: locationType || 'OFFICE',
            distance: distance,
            status: status || 'PENDING',
            note: note || (locationType === 'OFFICE' ? 'Tại văn phòng' : 'Không có ghi chú'),
            checkInTime: new Date(),
        });

        const savedRecord = await (await newRecord.save()).populate('userId', 'name');

        // ==========================================
        // LOGIC BẮN THÔNG BÁO (CẬP NHẬT CHO ADMIN)
        // ==========================================
        try {
            const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const userName = (savedRecord.userId as any)?.name || 'Nhân viên';

            // 1. Gửi cho NHÂN VIÊN (App)
            await this.notificationsService.create({
                userId: userId,
                title: 'Vào ca thành công',
                message: savedRecord.status === 'PENDING'
                    ? `Yêu cầu làm online đang chờ sếp duyệt.`
                    : `Bạn đã bắt đầu ca làm lúc ${timeStr}.`,
                type: 'ATTENDANCE'
            });

            // 2. GỬI CHO ADMIN (Web) - Để chuông trên Web nổ tin
            await this.notificationsService.create({
                userId: 'ADMIN', // Quy ước để hiện lên Web Admin
                title: savedRecord.status === 'PENDING' ? 'Yêu cầu Online mới' : 'Nhân viên vào ca',
                message: savedRecord.status === 'PENDING'
                    ? `${userName} vừa yêu cầu làm Online/Tại nhà. Sếp xem duyệt nhé!`
                    : `${userName} đã check-in vào ca lúc ${timeStr}.`,
                type: 'ATTENDANCE'
            });

        } catch (e) { console.log("Lỗi gửi thông báo checkin:", e.message); }

        return savedRecord;
    }

    async checkOut(recordId: string, ip: string, distance?: number, locationType?: string, note?: string, userLat?: number, userLon?: number) {
        const record = await this.attendanceModel.findById(recordId).populate('userId', 'name');
        if (!record) throw new NotFoundException('Không find thấy ca làm việc đang mở!');

        record.checkOutTime = new Date();
        if (distance) record.distance = distance;
        const savedRecord = await record.save();

        // --- GỬI THÔNG BÁO ---
        try {
            const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const userName = (savedRecord.userId as any)?.name || 'Nhân viên';

            // Thông báo cho nhân viên
            await this.notificationsService.create({
                userId: String(savedRecord.userId._id || savedRecord.userId),
                title: 'Ra ca thành công',
                message: `Bạn đã kết thúc ca làm lúc ${timeStr}. Hẹn gặp lại!`,
                type: 'ATTENDANCE'
            });

            // Gửi cho ADMIN (Web) để biết nhân viên đã về
            await this.notificationsService.create({
                userId: 'ADMIN',
                title: 'Nhân viên ra ca',
                message: `${userName} đã check-out ra về lúc ${timeStr}.`,
                type: 'ATTENDANCE'
            });
        } catch (e) { console.log("Lỗi gửi thông báo checkout:", e.message); }

        return savedRecord;
    }

    // Các hàm khác giữ nguyên logic duyệt của sếp...
    async approveSingle(id: string, adminReply?: string) {
        const updated = await this.attendanceModel.findByIdAndUpdate(
            id,
            { status: 'APPROVED', adminReply: adminReply || 'Đã duyệt' },
            { returnDocument: 'after' }
        );

        if (updated) {
            try {
                await this.notificationsService.create({
                    userId: String(updated.userId),
                    title: 'Yêu cầu được phê duyệt',
                    message: `Yêu cầu làm online của bạn đã được duyệt. Phản hồi: ${adminReply || 'Đã duyệt'}`,
                    type: 'ATTENDANCE'
                });
            } catch (e) { console.log("Lỗi gửi thông báo:", e.message); }
        }
        return updated;
    }

    async findAll() {
        return this.attendanceModel
            .find()
            .populate('userId', 'name position userId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async approveAllPending() {
        const pendingRecords = await this.attendanceModel.find({ status: 'PENDING' });

        const result = await this.attendanceModel.updateMany(
            { status: 'PENDING' },
            { status: 'APPROVED', note: 'Sếp đã duyệt làm online' }
        );

        if (pendingRecords.length > 0) {
            pendingRecords.forEach(async (record) => {
                try {
                    await this.notificationsService.create({
                        userId: String(record.userId),
                        title: 'Yêu cầu được phê duyệt',
                        message: `Yêu cầu làm online của bạn đã được sếp duyệt hàng loạt.`,
                        type: 'ATTENDANCE'
                    });
                } catch (e) {
                    console.log(`Lỗi gửi thông báo cho user ${record.userId}:`, e.message);
                }
            });
        }

        return result;
    }

    async getMonthlyReport(month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const config = await this.configService.getConfig();
        const [configH, configM] = config.startTime.split(':').map(Number);

        const attendances = await this.attendanceModel.find({
            checkInTime: { $gte: startDate, $lte: endDate }
        }).populate('userId', 'name phone').lean();

        const reportMap = new Map();

        attendances.forEach(item => {
            const uId = String(item.userId?._id || item.userId);
            if (!reportMap.has(uId)) {
                reportMap.set(uId, {
                    userId: uId,
                    name: item.userId?.name || 'Nhân viên',
                    phone: item.userId?.phone || '',
                    days: {},
                    totalApproved: 0,
                    totalLate: 0
                });
            }

            const userReport = reportMap.get(uId);
            const day = new Date(item.checkInTime).getDate();

            const checkIn = new Date(item.checkInTime);
            const isLate = checkIn.getHours() > configH || (checkIn.getHours() === configH && checkIn.getMinutes() > configM);

            if (!userReport.days[day] || item.status === 'APPROVED') {
                userReport.days[day] = {
                    status: item.status,
                    checkIn: item.checkInTime,
                    checkOut: item.checkOutTime,
                    isLate: isLate
                };
            }
        });

        const finalResult = Array.from(reportMap.values()).map(user => {
            let approvedCount = 0;
            let lateCount = 0;
            Object.values(user.days).forEach((d: any) => {
                if (d.status === 'APPROVED') approvedCount++;
                if (d.isLate) lateCount++;
            });
            return { ...user, totalApproved: approvedCount, totalLate: lateCount };
        });

        return finalResult;
    }

    private getReminderTime(timeStr: string): string {
        if (!timeStr) return '';
        let h = 0, m = 0;

        if (timeStr.toUpperCase().includes('M')) {
            const [time, modifier] = timeStr.trim().split(' ');
            const [hours, minutes] = time.split(':');
            h = parseInt(hours, 10);
            m = parseInt(minutes, 10);

            if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
            if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
        } else {
            const [hours, minutes] = timeStr.split(':');
            h = parseInt(hours, 10);
            m = parseInt(minutes, 10);
        }

        const date = new Date();
        date.setHours(h, m, 0, 0);
        date.setMinutes(date.getMinutes() - 10);

        const pad = (num: number) => String(num).padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Ho_Chi_Minh' })
    async handleAttendanceReminders() {
        const now = new Date();
        const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const config = await this.configService.getConfig();
        if (!config || !config.startTime || !config.endTime) return;

        const reminderStart = this.getReminderTime(config.startTime);
        const reminderEnd = this.getReminderTime(config.endTime);

        let title = '';
        let message = '';

        if (currentHHmm === reminderStart) {
            title = 'Sắp đến giờ làm rồi!';
            message = 'Đừng quên điểm danh vào ca để bắt đầu ngày mới nhé!';
        } else if (currentHHmm === reminderEnd) {
            title = 'Sắp hết giờ làm!';
            message = 'Chuẩn bị đồ đạc và đừng quên điểm danh ra ca nhé!';
        }

        if (title && message) {
            try {
                const users = await this.userModel.find({}, '_id').lean();
                users.forEach(async (user) => {
                    await this.notificationsService.create({
                        userId: String(user._id),
                        title: title,
                        message: message,
                        type: 'ATTENDANCE'
                    });
                });
                console.log(`[CronJob] Đã gửi nhắc nhở điểm danh lúc ${currentHHmm}`);
            } catch (e) {
                console.log("Lỗi cronjob nhắc nhở:", e.message);
            }
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Ho_Chi_Minh' })
    async handleAutoCheckOut() {
        try {
            const todayEnd = new Date();
            todayEnd.setHours(0, 0, 0, 0); // Đầu ngày hôm nay tức là đã qua 12h đêm ngày hôm qua

            // Những ai chưa quét mặt ra về của ngày hôm qua
            const openRecords = await this.attendanceModel.find({
                checkOutTime: { $exists: false },
                checkInTime: { $lt: todayEnd }
            });

            if (openRecords.length > 0) {
                const config = await this.configService.getConfig();
                let endH = 17, endM = 30; // Giờ tan làm mặc định là 17h30
                if (config && config.endTime) {
                    const [h, m] = config.endTime.split(':');
                    endH = parseInt(h, 10);
                    endM = parseInt(m, 10);
                }

                for (const record of openRecords) {
                    const checkInDate = new Date(record.checkInTime);
                    // Lấy chính ngày hôm đó lúc endH:endM để coi như lúc đó đi về
                    checkInDate.setHours(endH, endM, 0, 0);

                    // Tránh ca checkin muộn hơn cả endTime (Ví dụ đi làm lúc 18:00) thì chốt ca 23:59
                    if (checkInDate.getTime() < record.checkInTime.getTime()) {
                        checkInDate.setHours(23, 59, 59, 999);
                    }

                    record.checkOutTime = checkInDate;
                    record.note = record.note ? record.note + ' (Hệ thống tự động chốt ra ca do quên)' : 'Hệ thống tự động chốt ra ca do quên';
                    await record.save();
                }
                console.log(`[CronJob] Đã tự chốt hoàn tất ${openRecords.length} ca quên check-out.`);
            }
        } catch (e) {
            console.log("Lỗi cronjob tự động checkout:", e.message);
        }
    }
}