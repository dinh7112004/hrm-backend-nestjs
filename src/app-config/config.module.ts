import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { AppConfig, AppConfigSchema } from './schemas/config.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: AppConfig.name, schema: AppConfigSchema }])],
    controllers: [ConfigController],
    providers: [ConfigService],
    exports: [ConfigService], // Xuất ra để AttendanceService có thể dùng chung
})
export class ConfigModule { }