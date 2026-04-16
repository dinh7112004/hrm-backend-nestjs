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
        if (!actualCheckIn || !actualCheckOut) return 0;

        const shiftStart = new Date(actualCheckIn);
        const [startH, startM] = shiftStartStr.split(':').map(Number);
        shiftStart.setHours(startH, startM, 0, 0);

        const shiftEnd = new Date(actualCheckOut);
        const [endH, endM] = shiftEndStr.split(':').map(Number);
        shiftEnd.setHours(endH, endM, 0, 0);

        // Chặn đầu đuôi theo ca làm việc trên Web quản trị
        let validStart = actualCheckIn < shiftStart ? shiftStart : actualCheckIn;
        let validEnd = actualCheckOut > shiftEnd ? shiftEnd : actualCheckOut;

        if (validStart >= validEnd) return 0;

        // ĐỊNH NGHĨA KHUNG GIỜ NGHỈ TRƯA
        const lunchStart = new Date(validStart);
        lunchStart.setHours(12, 0, 0, 0);
        const lunchEnd = new Date(validStart);
        lunchEnd.setHours(13, 30, 0, 0);

        let totalMs = validEnd.getTime() - validStart.getTime();

        // TÍNH TOÁN PHẦN GIAO THOA VỚI GIỜ NGHỈ TRƯA
        const overlapLunchStart = validStart > lunchStart ? validStart : lunchStart;
        const overlapLunchEnd = validEnd < lunchEnd ? validEnd : lunchEnd;

        if (overlapLunchStart < overlapLunchEnd) {
            totalMs -= (overlapLunchEnd.getTime() - overlapLunchStart.getTime());
        }

        return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
    }

    // --- HÀM TÍNH LƯƠNG CHÍNH ---
    async calculateMonthlyPayroll(userId: string, month: string) {
        const [mStr, yStr] = month.split('-');
        const m = parseInt(mStr);
        const y = parseInt(yStr);

        const startOfMonth = new Date(y, m - 1, 1);
        const endOfMonth = new Date(y, m, 0, 23, 59, 59);

        // 1. Tìm User để lấy lương cơ bản (Chấp nhận cả _id hoặc mã nhân viên userId)
        let user = await this.userModel.findById(userId).exec();
        if (!user) {
            user = await this.userModel.findOne({ userId: userId }).exec();
        }

        if (!user) throw new Error('Không tìm thấy nhân viên này!');
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
        let lateCount = 0;
        attendances.forEach(att => {
            actualWorkHours += this.calculateActualWorkHours(att.checkInTime, att.checkOutTime, shiftStart, shiftEnd);
            
            if (att.checkInTime && att.checkOutTime) {
                const shiftStartObj = new Date(att.checkInTime);
                const [startH, startM] = shiftStart.split(':').map(Number);
                shiftStartObj.setHours(startH, startM, 0, 0);

                const shiftEndObj = new Date(att.checkOutTime);
                const [endH, endM] = shiftEnd.split(':').map(Number);
                shiftEndObj.setHours(endH, endM, 0, 0);

                let isPenalty = false;
                // Nếu đi muộn hơn 0 phút
                if (new Date(att.checkInTime).getTime() > shiftStartObj.getTime()) {
                    isPenalty = true;
                }
                // Nếu về sớm hơn 0 phút
                if (new Date(att.checkOutTime).getTime() < shiftEndObj.getTime()) {
                    isPenalty = true;
                }
                if (isPenalty) lateCount++;
            }
        });

        const parseDateStr = (dateStr: string): Date => {
            if (!dateStr) return new Date();
            // 1. Thử parse trực tiếp (Hỗ trợ ISO YYYY-MM-DD...)
            const dObj = new Date(dateStr);
            if (!isNaN(dObj.getTime())) return dObj;

            // 2. Thử parse định dạng DD/MM/YYYY hoặc DD-MM-YYYY
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

            return new Date();
        };

        // 4. Cộng giờ nghỉ phép (Chỉ tính loại APPROVED)
        const leaves = await this.leaveModel.find({ userId, status: 'APPROVED' });
        let leaveHours = 0;
        leaves.forEach(leave => {
            if (!leave.startDate) return;
            const leaveStart = parseDateStr(leave.startDate);
            if (leaveStart >= startOfMonth && leaveStart <= endOfMonth) {
                // Ưu tiên paidHours, nếu bằng 0 thì lấy durationHours (Phòng trường hợp lỗi lưu trữ hoặc hết quỹ phép)
                leaveHours += (leave.paidHours || leave.durationHours || 0);
            }
        });

        const totalValidHours = actualWorkHours + leaveHours;

        // 5. Thưởng / Phạt
        const adjustments = await this.adjustmentModel.find({
            userId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });
        
        const bonusItems = adjustments.filter(a => a.type === 'BONUS');
        const fineItems = adjustments.filter(a => a.type === 'FINE');

        const totalBonus = bonusItems.reduce((sum, item) => sum + item.amount, 0);
        const totalFine = fineItems.reduce((sum, item) => sum + item.amount, 0);

        const bonusDetails = bonusItems.map(a => ({ reason: a.reason, amount: a.amount, date: a.date }));
        const fineDetails = fineItems.map(a => ({ reason: a.reason, amount: a.amount, date: a.date }));

        // 6. Chốt Lương NET
        const salaryPerHour = standardWorkHours > 0 ? (baseSalary / standardWorkHours) : 0;
        const netSalary = Math.round((totalValidHours * salaryPerHour) + totalBonus - totalFine);
        const netSalaryFull = baseSalary + totalBonus - totalFine;

        const actualWorkDays = Math.round((totalValidHours / 8) * 100) / 100;

        // 7. Lưu DataBase
        return this.payrollModel.findOneAndUpdate(
            { userId, month },
            {
                baseSalary,
                actualWorkDays,
                actualWorkHours: totalValidHours,
                rawWorkHours: Math.round(actualWorkHours * 100) / 100,
                paidLeaveHours: Math.round(leaveHours * 100) / 100,
                bonus: totalBonus,
                bonusDetails,
                fine: totalFine,
                fineDetails,
                netSalary,
                netSalaryFull,
                standardWorkDays,
                hourlyRate: Math.round(salaryPerHour * 100) / 100,
                lateCount
            },
            { upsert: true, returnDocument: 'after' }
        ).populate('userId', 'name email baseSalary phone');
    }

    async createAdjustment(data: any) { return new this.adjustmentModel(data).save(); }

    async getAdjustmentsByUser(userId: string, month: string) {
        const [m, y] = month.split('-');
        const startOfMonth = new Date(parseInt(y), parseInt(m) - 1, 1);
        const endOfMonth = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59);
        return this.adjustmentModel.find({
            userId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ date: -1 });
    }



    async updateStatus(id: string, status: string) {
        return this.payrollModel.findByIdAndUpdate(id, { status }, { returnDocument: 'after' }).populate('userId', 'name email baseSalary phone');
    }

    async getPayrollByMonth(month: string) {
        return this.payrollModel.find({ month }).populate('userId', 'name email baseSalary phone');
    }
}