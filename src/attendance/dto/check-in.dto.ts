// Thêm latitude và longitude vào dữ liệu nhận từ App
export class CheckInDto {
    userId: string;
    latitude: number;  // Tọa độ thực tế từ GPS App
    longitude: number; // Tọa độ thực tế từ GPS App
    note?: string;
}