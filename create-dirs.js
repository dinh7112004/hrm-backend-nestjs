// Script tạo thư mục uploads/leaves nếu chưa có
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'uploads', 'leaves');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log('✅ Đã tạo thư mục uploads/leaves');
} else {
  console.log('✅ Thư mục uploads/leaves đã tồn tại');
}
