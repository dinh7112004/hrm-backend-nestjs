import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ConfigService } from './config.service';

@Controller('config')
export class ConfigController {
    constructor(private readonly configService: ConfigService) { }

    @Get() // App và Web gọi cái này để lấy tọa độ
    getConfig() {
        return this.configService.getConfig();
    }

    @Patch() // Web Admin gọi cái này để lưu tọa độ mới
    updateConfig(@Body() updateData: any) {
        return this.configService.updateConfig(updateData);
    }
}