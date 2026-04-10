import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payroll } from './schemas/payroll.schema';
import { Attendance } from '../attendance/schemas/attendance.schema';
import { PayrollAdjustment } from './schemas/adjustment.schema';
import { User } from '../user/schemas/user.schema';
import { Leave } from '../leaves/schemas/leave.schema';
import { AppConfig } from '../app-config/schemas/config.schema';

@Injectable()
export class PayrollService {
    constructor(
        @InjectModel(Payroll.name) private payrollModel: Model<Payroll>,
        @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
        @InjectModel(PayrollAdjustment.name) private adjustmentModel: Model<PayrollAdjustment>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Leave.name) private leaveModel: Model<Leave>,
        @InjectModel(AppConfig.name) private configModel: Model<AppConfig>,
    ) { }

    // --- THUẬT TOÁN ĐẾM NGÀY CÔNG CHUẨN (Thứ 7 xen kẽ) ---
    private calculateStandardWorkDays(year: number, month: number): number {
        const daysInMonth = new Date(year, month, 0).getDate();
        let workDays = 0;
        let saturdayCount = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();

            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                workDays++; // T2 - T6
            } else if (dayOfWeek === 6) {
                saturdayCount++;
                if (saturdayCount % 2 !== 0) workDays++; // Thứ 7 tuần 1, 3, 5 đi làm
            }
        }
        return workDays;
    }

    // --- THUẬT TOÁN TÍNH GIỜ THỰC LÀM (Khoét nghỉ trưa, chặn đầu đuôi) ---
    private calculateActualWorkHours(actualCheckIn: Date, actualCheckOut: Date, shiftStartStr: string, shiftEndStr: string): number {
        const shiftStart = new Date(actualCheckIn);
        const [startH, startM] = shiftStartStr.split(':').map(Number);
        shiftStart.setHours(startH, startM, 0, 0);

        const shiftEnd = new Date(actualCheckOut);
        const [endH, endM] = shiftEndStr.split(':').map(Number);
        shiftEnd.setHours(endH, endM, 0, 0);

        const lunchStart = new Date(actualCheckIn);
        lunchStart.setHours(12, 0, 0, 0); // Nghỉ trưa cố định 12h00

        const lunchEnd = new Date(actualCheckIn);
        lunchEnd.setHours(13, 30, 0, 0); // Hết nghỉ trưa 1h30 chiều

        let validStart = actualCheckIn < shiftStart ? shiftStart : actualCheckIn;
        let validEnd = actualCheckOut > shiftEnd ? shiftEnd : actualCheckOut;

        if (validStart >= validEnd) return 0;

        let totalMs = validEnd.getTime() - validStart.getTime();

        const overlapLunchStart = validStart > lunchStart ? validStart : lunchStart;
        const overlapLunchEnd = validEnd < lunchEnd ? validEnd : lunchEnd;

        if (overlapLunchStart < overlapLunchEnd) {
            totalMs -= (overlapLunchEnd.getTime() - overlapLunchStart.getTime());
        }

        return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100; // Trả về giờ (VD: 7.5)
    }

    // --- HÀM TÍNH LƯƠNG CHÍNH ---
    async calculateMonthlyPayroll(userId: string, month: string) {
        const [mStr, yStr] = month.split('-');
        const m = parseInt(mStr);
        const y = parseInt(yStr);

        const startOfMonth = new Date(y, m - 1, 1);
        const endOfMonth = new Date(y, m, 0, 23, 59, 59);

        // 1. Lấy thông tin cơ bản & cấu hình giờ làm
        const user = await this.userModel.findById(userId);
        if (!user) throw new Error("Không tìm thấy nhân viên này!");
        const baseSalary = user.baseSalary || 0;

        let config = await this.configModel.findOne();
        if (!config) config = await this.configModel.create({});
        const shiftStart = config.startTime || '08:00';
        const shiftEnd = config.endTime || '17:30'; // Mặc định về 17:30

        // 2. Chốt công chuẩn tháng đó (Xen kẽ T7)
        const standardWorkDays = this.calculateStandardWorkDays(y, m);
        const standardWorkHours = standardWorkDays * 8;

        // 3. Tính tổng số giờ chấm công thực tế
        const attendances = await this.attendanceModel.find({
            userId,
            checkInTime: { $gte: startOfMonth, $lte: endOfMonth },
            checkOutTime: { $ne: null }
        });

        let actualWorkHours = 0;
        attendances.forEach(att => {
            actualWorkHours += this.calculateActualWorkHours(att.checkInTime, att.checkOutTime, shiftStart, shiftEnd);
        });

        // 4. Cộng giờ nghỉ phép (Chỉ tính loại APPROVED)
        const leaves = await this.leaveModel.find({ userId, status: 'APPROVED' });
        let leaveHours = 0;
        leaves.forEach(leave => {
            const leaveStart = new Date(leave.startDate);
            if (leaveStart >= startOfMonth && leaveStart <= endOfMonth) {
                if (leave.endDate) {
                    const leaveEnd = new Date(leave.endDate);
                    const days = Math.floor((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    leaveHours += days * 8;
                } else {
                    leaveHours += 8;
                }
            }
        });

        const totalValidHours = actualWorkHours + leaveHours;

        // 5. Thưởng / Phạt
        const adjustments = await this.adjustmentModel.find({
            userId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });
        const totalBonus = adjustments.filter(a => a.type === 'BONUS').reduce((sum, item) => sum + item.amount, 0);
        const totalFine = adjustments.filter(a => a.type === 'FINE').reduce((sum, item) => sum + item.amount, 0);

        // 6. Chốt Lương NET
        const salaryPerHour = standardWorkHours > 0 ? (baseSalary / standardWorkHours) : 0;
        const netSalary = Math.round((totalValidHours * salaryPerHour) + totalBonus - totalFine);

        const actualWorkDays = Math.round((totalValidHours / 8) * 100) / 100;

        // 7. Lưu DataBase
        return this.payrollModel.findOneAndUpdate(
            { userId, month },
            {
                baseSalary,
                actualWorkDays,
                actualWorkHours: totalValidHours,
                bonus: totalBonus,
                fine: totalFine,
                netSalary,
                standardWorkDays
            },
            { upsert: true, new: true }
        );
    }

    async createAdjustment(data: any) { return new this.adjustmentModel(data).save(); }

    async getAdjustmentsByUser(userId: string, month: string) {
        const [m, y] = month.split('-');
        const startOfMonth = new Date(parseInt(y), parseInt(m) - 1, 1);
        const endOfMonth = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59);
        return this.adjustmentModel.find({
            userId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ createdAt: -1 });
    }



    async getPayrollByMonth(month: string) {
        return this.payrollModel.find({ month }).populate('userId', 'name email baseSalary phone');
    }
}