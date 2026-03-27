import { Controller, Get, Post, Put, Delete, Body, Param, UnauthorizedException, NotFoundException, BadRequestException, Patch } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // ==========================================
    // 1. API CHO APP MOBILE (Đăng nhập & Khóa máy)
    // ==========================================
    @Post('login')
    async login(@Body() body: any) {
        const { phone, password, deviceId } = body;
        const user = await this.usersService.findOneByPhone(phone);

        if (!user || user.password !== password) {
            throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không đúng');
        }

        if (user.isActive === false) {
            throw new UnauthorizedException('Tài khoản đã bị khóa');
        }

        // LOGIC: KHÓA 1 THIẾT BỊ
        if (!user.deviceId) {
            user.deviceId = deviceId;
            await (user as any).save();
        } else {
            if (user.deviceId !== deviceId) {
                throw new UnauthorizedException('Tài khoản này đã được đăng ký trên một thiết bị khác!');
            }
        }

        return {
            user: {
                id: user._id,
                _id: user._id,
                userId: user.userId,
                name: user.name,
                phone: user.phone,
                dept: user.dept,
                position: user.position || "Nhân viên",
                deviceId: user.deviceId
            }
        };
    }

    // ==========================================
    // 2. CÁC API CHO ADMIN PANEL (ReactJS)
    // ==========================================

    // Lấy danh sách nhân viên
    @Get()
    async findAll() {
        // Gọi hàm lấy tất cả user từ service
        return this.usersService.findAll();
    }

    // Tạo nhân viên mới (Trùng với link Admin đang gọi)
    @Post('create')
    async create(@Body() body: any) {
        return this.usersService.create(body);
    }

    // Sửa thông tin nhân viên
    @Put(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.usersService.update(id, body);
    }

    // Xoá nhân viên
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    // Reset thiết bị (Hàm mới làm cho nút màu cam)
    @Put(':id/reset-device')
    async resetDevice(@Param('id') id: string) {
        const user = await this.usersService.findOne(id); // Tìm user theo ID
        if (!user) throw new NotFoundException('Không tìm thấy nhân viên');

        user.deviceId = '';
        await (user as any).save();

        return { message: 'Đã gỡ bỏ liên kết thiết bị thành công' };
    }

    @Post(':id/push-token')
    async updatePushToken(@Param('id') id: string, @Body() body: { token: string }) {
        if (!body.token) {
            // Nhớ import thêm BadRequestException ở trên cùng nhé sếp
            throw new BadRequestException('Thiếu mã token trong request');
        }
        return this.usersService.updatePushToken(id, body.token);
    }

    @Patch(':id/salary')
    async setSalary(@Param('id') id: string, @Body('baseSalary') salary: number) {
        return this.usersService.updateSalary(id, salary);
    }

    @Get(':id')
    async findOneUser(@Param('id') id: string) {
        const user = await this.usersService.findOne(id);
        if (!user) {
            throw new NotFoundException('Không tìm thấy nhân viên');
        }
        return user;
    }
}