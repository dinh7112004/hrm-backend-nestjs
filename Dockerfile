# 1. Dùng Node.js bản 20 làm môi trường chạy
FROM node:20-alpine

# 2. Tạo thư mục chứa app trong Docker
WORKDIR /usr/src/app

# 3. Copy file quản lý thư viện vào
COPY package*.json ./

# 4. Cài đặt thư viện (dependencies)
RUN npm install

# 5. Copy toàn bộ mã nguồn vào
COPY . .

# 6. Build code NestJS (vì bạn đang dùng TypeScript)
RUN npm run build

# 7. Mở cổng 3000 để app thoát ra ngoài
EXPOSE 3000

# 8. Lệnh khởi chạy app chính thức
CMD ["npm", "run", "start:prod"]