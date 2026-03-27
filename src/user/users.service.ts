import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) { }

    // Tìm theo số điện thoại phục vụ Login
    async findOneByPhone(phone: string): Promise<User | null> {
        return this.userModel.findOne({ phone }).exec();
    }

    // Cập nhật trạng thái nghỉ việc (isActive = false)
    async updateStatus(id: string, isActive: boolean) {
        const user = await this.userModel.findByIdAndUpdate(id, { isActive }, { new: true });
        if (!user) throw new NotFoundException('Không tìm thấy nhân viên');
        return user;
    }

    // Lấy danh sách nhân viên
    async findAll() {
        return this.userModel.find().exec();
    }

    // Tìm 1 nhân viên theo ID
    async findOne(id: string) {
        return this.userModel.findById(id).exec();
    }

    // ==========================================
    // CÁC HÀM MỚI THÊM CHO ADMIN PANEL
    // ==========================================

    // Thêm nhân viên mới
    async create(createUserDto: any) {
        try {
            const newUser = new this.userModel(createUserDto);
            return await newUser.save();
        } catch (error: any) {
            // Xử lý mượt mà lỗi trùng Mã NV (unique: true trong schema)
            if (error.code === 11000) {
                throw new BadRequestException('Mã nhân viên hoặc thông tin đã tồn tại!');
            }
            throw new BadRequestException('Lỗi khi tạo nhân viên mới');
        }
    }

    // Cập nhật thông tin nhân viên
    async update(id: string, updateUserDto: any) {
        try {
            const updatedUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
            if (!updatedUser) throw new NotFoundException('Không tìm thấy nhân viên để cập nhật');
            return updatedUser;
        } catch (error: any) {
            // Bắt lỗi trùng lặp dữ liệu từ MongoDB (ví dụ trùng Mã NV hoặc SĐT)
            if (error.code === 11000) {
                throw new BadRequestException('Thông tin cập nhật (SĐT hoặc Mã NV) đã bị trùng với người khác!');
            }
            // Nếu lỗi khác thì ném ra ngoài
            throw error;
        }
    }

    // Xóa nhân viên
    async remove(id: string) {
        const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
        if (!deletedUser) throw new NotFoundException('Không tìm thấy nhân viên để xóa');
        return deletedUser;
    }

    async updatePushToken(id: string, token: string) {
        // BƯỚC 1: Thu hồi Token cũ ở các tài khoản khác (Chống trùng lặp thông báo)
        // Nếu token có giá trị (tức là lúc đăng nhập), mình đi dọn dẹp trước
        if (token) {
            await this.userModel.updateMany(
                { pushToken: token },
                { $set: { pushToken: null } }
            ).exec();
        }

        // BƯỚC 2: Cập nhật token cho đúng nhân viên đang thao tác
        // (Lúc đăng xuất, app gửi lên token = null, nó sẽ bỏ qua bước 1 và nhảy thẳng xuống đây để xóa token của user này)
        const updatedUser = await this.userModel.findByIdAndUpdate(
            id,
            { pushToken: token },
            { new: true }
        ).exec();

        if (!updatedUser) {
            throw new NotFoundException('Không tìm thấy nhân viên để lưu token');
        }
        return { message: 'Cập nhật push token thành công', pushToken: updatedUser.pushToken };
    }


    async updateSalary(id: string, baseSalary: number) {
        // Kiểm tra xem số tiền nhập vào có hợp lệ không (không được âm)
        if (baseSalary < 0) {
            throw new BadRequestException('Mức lương không được nhỏ hơn 0');
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(
            id,
            { baseSalary },
            { new: true }
        ).exec();

        if (!updatedUser) {
            throw new NotFoundException('Không tìm thấy nhân viên để cập nhật lương');
        }

        return {
            message: 'Cập nhật lương cơ bản thành công',
            name: updatedUser.name,
            baseSalary: updatedUser.baseSalary
        };
    }


}