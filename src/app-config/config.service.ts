import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppConfig } from './schemas/config.schema';

@Injectable()
export class ConfigService {
    constructor(@InjectModel(AppConfig.name) private configModel: Model<AppConfig>) { }

    // Lấy cấu hình (Nếu chưa có thì tạo mới bản ghi đầu tiên)
    async getConfig() {
        let config = await this.configModel.findOne();
        if (!config) {
            config = await this.configModel.create({});
        }
        return config;
    }

    // Cập nhật cấu hình mới từ Web Admin
    async updateConfig(updateData: any) {
        return this.configModel.findOneAndUpdate({}, updateData, { returnDocument: 'after', upsert: true });
    }
}