import { Controller, Get, Post, Put, Body, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/admin') // Đặt api/admin cho đồng bộ nếu các route khác của sếp cũng có /api
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // ==========================================
    // 1. API ĐĂNG NHẬP DÀNH CHO ADMIN
    // ==========================================
    @Post('login')
    async login(@Body() body: any) {
        const { username, password } = body;

        // Tìm admin trong database
        const admin = await this.adminService.findByUsername(username);

        // Kiểm tra tồn tại và khớp mật khẩu
        if (!admin || admin.password !== password) {
            throw new UnauthorizedException('Tài khoản hoặc mật khẩu Admin không đúng!');
        }

        // Trả về dữ liệu cho React Web
        return {
            message: 'Đăng nhập thành công',
            data: {
                _id: (admin as any)._id,
                username: admin.username,
                name: admin.name,
                role: admin.role, // Trả về role để Web nhận diện
            }
        };
    }

    // ==========================================
    // 2. API ĐỔI MẬT KHẨU ADMIN
    // ==========================================
    @Put('change-password')
    async changePassword(@Body() body: any) {
        const { username, oldPassword, newPassword } = body;

        // Tìm tài khoản Admin trong Database
        const admin = await this.adminService.findByUsername(username);
        if (!admin) {
            throw new NotFoundException('Không tìm thấy tài khoản Admin!');
        }

        // Kiểm tra mật khẩu cũ
        if (admin.password !== oldPassword) {
            throw new BadRequestException('Mật khẩu hiện tại không đúng!');
        }

        // Lưu mật khẩu mới
        admin.password = newPassword;
        await (admin as any).save();

        return { message: 'Đổi mật khẩu thành công!' };
    }

    // ==========================================
    // 3. CÁC API KHÁC (Tạo và Lấy danh sách)
    // ==========================================
    @Post('create')
    async create(@Body() createAdminDto: any) {
        try {
            const newAdmin = await this.adminService.create(createAdminDto);
            return { message: 'Tạo tài khoản Admin thành công', data: newAdmin };
        } catch (error: any) {
            return { message: 'Lỗi tạo Admin', error: error.message };
        }
    }

    @Get('list')
    async findAll() {
        const admins = await this.adminService.findAll();
        return { data: admins };
    }
}