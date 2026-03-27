import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './schemas/admin.schema';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    ) { }

    // Hàm tạo Admin mới
    async create(createAdminDto: any): Promise<Admin> {
        const createdAdmin = new this.adminModel(createAdminDto);
        return createdAdmin.save();
    }

    // Hàm lấy danh sách Admin (ẩn password đi cho an toàn)
    async findAll(): Promise<Admin[]> {
        return this.adminModel.find().select('-password').exec();
    }

    // Hàm tìm Admin theo username (Dùng cực nhiều cho việc Đăng nhập sau này)
    async findByUsername(username: string): Promise<Admin | null> {
        return this.adminModel.findOne({ username }).exec();
    }
}