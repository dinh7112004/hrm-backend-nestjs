import { Controller, Get, Post, Body, Put, Ip, Param, Query, Delete } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    // API 1: Xử lý khi App bấm "VÀO CA"

    @Post('checkin')
    async handleCheckIn(@Body() data: any, @Ip() ip: string) {
        const clientIp = data.ipAddress || ip || 'Không xác định';

        return this.attendanceService.checkIn(
            data.userId,
            clientIp,
            data.distance,
            data.locationType,
            data.note,
            data.status,
            data.latitude,  // <--- THÊM VÀO
            data.longitude  // <--- THÊM VÀO
        );
    }

    @Post('checkout')
    async handleCheckOut(@Body() data: any, @Ip() ip: string) {
        const clientIp = data.ipAddress || ip || 'Không xác định';

        return this.attendanceService.checkOut(
            data.recordId,
            clientIp,
            data.distance,
            data.locationType,
            data.note,
            data.latitude,  // <--- THÊM VÀO (Nếu muốn kiểm tra lúc ra)
            data.longitude  // <--- THÊM VÀO
        );
    }
    // API cho Web lấy danh sách nhật ký
    @Get()
    async getAll() {
        return this.attendanceService.findAll();
    }

    // API cho nút "Duyệt ngay" trên Web
    @Put('approve-all')
    async approveAll() {
        return this.attendanceService.approveAllPending();
    }

    // API duyệt 1 yêu cầu cụ thể
    @Put(':id/approve')
    async approveSingle(@Param('id') id: string, @Body('reply') reply: string) {
        return this.attendanceService.approveSingle(id, reply);
    }


    @Get('report/monthly')
    async getMonthlyReport(
        @Query('month') month: string,
        @Query('year') year: string
    ) {
        const m = month ? parseInt(month) : new Date().getMonth() + 1;
        const y = year ? parseInt(year) : new Date().getFullYear();
        return this.attendanceService.getMonthlyReport(m, y);
    }

    @Delete(':id')
    async deleteAttendance(@Param('id') id: string) {
        return this.attendanceService.deleteAttendance(id);
    }
}