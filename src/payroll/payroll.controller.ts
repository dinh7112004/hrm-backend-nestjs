// /src/payroll/payroll.controller.ts
import { Controller, Get, Post, Body, Query, Delete, Param, Patch } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) { }

    // 1. API: Tạo một phiếu Thưởng hoặc Phạt
    @Post('adjustment')
    async createAdjustment(@Body() data: {
        userId: string,
        type: 'BONUS' | 'FINE',
        amount: number,
        reason: string,
        date: string // Định dạng YYYY-MM-DD
    }) {
        return this.payrollService.createAdjustment(data);
    }

    // 2. API: Tính toán và chốt lương tháng cho 1 nhân viên
    @Post('calculate')
    async calculate(@Body() data: { userId: string, month: string }) {
        return this.payrollService.calculateMonthlyPayroll(data.userId, data.month);
    }

    // 3. API: Lấy bảng tổng hợp lương của cả công ty trong tháng
    @Get('report')
    async getReport(@Query('month') month: string) {
        return this.payrollService.getPayrollByMonth(month);
    }

    // 4. API: Xem lịch sử thưởng phạt của 1 nhân viên
    @Get('adjustments/:userId')
    async getAdjustments(@Param('userId') userId: string, @Query('month') month: string) {
        return this.payrollService.getAdjustmentsByUser(userId, month);
    }

    // 5. API: Cập nhật trạng thái (Checked, Paid...)
    @Patch('status/:id')
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.payrollService.updateStatus(id, status);
    }
}