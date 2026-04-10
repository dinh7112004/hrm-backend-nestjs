import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // 1. Import Swagger

// Tự động tạo thư mục uploads/leaves nếu chưa có
const uploadsDir = join(process.cwd(), 'uploads', 'leaves');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Đã tạo thư mục uploads/leaves');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 2. Cấu hình CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Cấu hình Swagger (Tài liệu API)
  const config = new DocumentBuilder()
    .setTitle('Hệ Thống API App Điểm Danh')
    .setDescription('Tài liệu hướng dẫn sử dụng các Endpoint cho Mobile và Web Admin')
    .setVersion('1.0')
    .addBearerAuth() // Cho phép nhập Token để test API nếu có bảo mật JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Đường dẫn truy cập tài liệu sẽ là: domain.com/api-docs
  SwaggerModule.setup('api-docs', app, document);

  // 4. Cấu hình phục vụ file tĩnh
  const rootPath = join(__dirname, '..');
  app.useStaticAssets(rootPath, {
    prefix: '/',
    index: false,
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server đang chạy tại cổng: ${port}`);
  console.log(`📄 Tài liệu API (Swagger): http://localhost:${port}/api-docs`);
}
bootstrap();