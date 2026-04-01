# 1. Dùng Node.js bản 20 làm môi trường chạy
FROM node:20-alpine

# 2. Cài đặt gói tzdata để hỗ trợ múi giờ (Cần thiết cho Alpine)
RUN apk add --no-cache tzdata

# 3. Thiết lập biến môi trường Múi giờ Việt Nam
ENV TZ=Asia/Ho_Chi_Minh

# 4. Tạo thư mục chứa app trong Docker
WORKDIR /usr/src/app

# 5. Copy file quản lý thư viện vào
COPY package*.json ./

# 6. Cài đặt thư viện (dependencies)
RUN npm install

# 7. Copy toàn bộ mã nguồn vào
COPY . .

# 8. Build code NestJS
RUN npm run build

# 9. Đảm bảo hệ thống Docker sử dụng đúng múi giờ đã thiết lập
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 10. Mở cổng 3000 (hoặc 10000 tùy theo Render)
EXPOSE 3000

# 11. Lệnh khởi chạy app chính thức
CMD ["npm", "run", "start:prod"]