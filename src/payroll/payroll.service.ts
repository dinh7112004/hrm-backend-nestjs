import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payroll } from './schemas/payroll.schema';
import { Attendance } from '../attendance/schemas/attendance.schema';
import { PayrollAdjustment } from './schemas/adjustment.schema';
import { User } from '../user/schemas/user.schema'; // Import thêm User Schema

@Injectable()
export class PayrollService {
    constructor(
        @InjectModel(Payroll.name) private payrollModel: Model<Payroll>,
        @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
        @InjectModel(PayrollAdjustment.name) private adjustmentModel: Model<PayrollAdjustment>,
        @InjectModel(User.name) private userModel: Model<User>, // Inject thêm UserModel
    ) { }

    async calculateMonthlyPayroll(userId: string, month: string) {
        // 1. Lấy lương cơ bản THẬT từ User
        const user = await this.userModel.findById(userId);
        if (!user) throw new Error("Không tìm thấy nhân viên này!");

        // Nếu sếp chưa set lương trong User thì mặc định là 0 hoặc sếp có thể set một mức sàn
        const baseSalary = user.baseSalary || 0;

        // 2. Tính số ngày công thực tế (giữ nguyên logic MM-YYYY)
        const attendanceCount = await this.attendanceModel.countDocuments({
            userId,
            date: { $regex: month },
            status: { $in: ['PRESENT', 'LATE'] }
        });

        // 3. Tính tổng Thưởng & Phạt trong tháng
        const [m, y] = month.split('-');
        const startOfMonth = new Date(parseInt(y), parseInt(m) - 1, 1);
        const endOfMonth = new Date(parseInt(y), parseInt(m), 0, 23, 59, 59);

        const adjustments = await this.adjustmentModel.find({
            userId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const totalBonus = adjustments
            .filter(a => a.type === 'BONUS')
            .reduce((sum, item) => sum + item.amount, 0);

        const totalFine = adjustments
            .filter(a => a.type === 'FINE')
            .reduce((sum, item) => sum + item.amount, 0);

        const standardWorkDays = 26;

        // 4. Công thức chốt hạ dựa trên lương riêng của mỗi người
        const netSalary = Math.round(
            (baseSalary / standardWorkDays) * attendanceCount + totalBonus - totalFine
        );

        // 5. Lưu vào bảng lương
        return this.payrollModel.findOneAndUpdate(
            { userId, month },
            {
                baseSalary, // Lưu lại mức lương tại thời điểm tính
                actualWorkDays: attendanceCount,
                bonus: totalBonus,
                fine: totalFine,
                netSalary,
                standardWorkDays
            },
            { upsert: true, new: true }
        );
    }

    // API tạo phiếu thưởng phạt
    async createAdjustment(data: any) {
        return new this.adjustmentModel(data).save();
    }

    // Lấy lịch sử thưởng phạt của nhân viên trong tháng
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
        return this.payrollModel.find({ month }).populate('userId', 'name email baseSalary'); // Thêm baseSalary vào populate để frontend hiển thị
    }
}