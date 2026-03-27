import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    // API TEST: Tạo thông báo thủ công bằng Postman
    @Post()
    create(@Body() body: { userId: string; title: string; message: string; type: string }) {
        return this.notificationsService.create(body);
    }

    // ==========================================
    // API DÀNH CHO ADMIN MỚI THÊM NÈ SẾP
    // ==========================================

    // Lấy danh sách thông báo của Admin
    @Get('admin')
    findAdminNotifications() {
        // Truyền cứng chữ 'ADMIN' để lấy các thông báo dùng chung cho ban quản trị
        return this.notificationsService.findByUserId('ADMIN');
    }

    // Admin đánh dấu tất cả là đã đọc
    @Patch('admin/read-all')
    markAllAdminAsRead() {
        return this.notificationsService.markAllAsRead('ADMIN');
    }

    // ==========================================
    // API DÀNH CHO NHÂN VIÊN (GIỮ NGUYÊN)
    // ==========================================

    // Lấy thông báo của 1 user cụ thể
    @Get('user/:userId')
    findByUser(@Param('userId') userId: string) {
        return this.notificationsService.findByUserId(userId);
    }

    // Đánh dấu 1 thông báo là đã đọc (Admin và User dùng chung hàm này được)
    @Patch(':id/read')
    markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    // Đánh dấu tất cả là đã đọc (Dành cho nhân viên)
    @Patch('user/:userId/read-all')
    markAllAsRead(@Param('userId') userId: string) {
        return this.notificationsService.markAllAsRead(userId);
    }
}