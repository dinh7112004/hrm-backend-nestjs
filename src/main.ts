import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // 1. Khởi tạo App với kiểu NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 2. Cấu hình CORS mở rộng - Cho phép Web Admin và Mobile truy cập
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  /**
   * 3. CẤU HÌNH PHỤC VỤ FILE TĨNH (STATIC ASSETS)
   * Sử dụng join(__dirname, '..') để lấy đường dẫn tuyệt đối từ thư mục src/ ra ngoài root
   * Điều này đảm bảo NestJS luôn nhìn thấy folder /uploads
   */
  const rootPath = join(__dirname, '..');

  app.useStaticAssets(rootPath, {
    prefix: '/', // Để trống prefix vì trong DB bạn đã lưu là "/uploads/leaves/..."
    index: false,
    setHeaders: (res) => {
      // Các headers này giúp vượt qua cơ chế bảo mật khắt khe của trình duyệt và Ngrok
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });



const port = process.env.PORT || 3000; // Nó sẽ lấy cổng của Render, nếu không có thì lấy 3000
await app.listen(port, '0.0.0.0'); // Thêm '0.0.0.0' để Render nó tìm thấy server của sếp
console.log(`Server đang chạy tại cổng: ${port}`);
}
bootstrap();