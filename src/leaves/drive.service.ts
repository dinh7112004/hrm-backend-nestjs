import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DriveService {
    private readonly logger = new Logger(DriveService.name);
    private drive: any;

    // ========================================
    // CẤU HÌNH OAuth2 - Điền thông tin vào đây
    // ========================================
    private CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    private CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    private REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    private FOLDER_ID = '1nSC5wgMFXGIWtqaLTymkyBHA8N20eglQ'; // Folder My Drive của anh

    constructor() {
        try {
            const oauth2Client = new google.auth.OAuth2(
                this.CLIENT_ID,
                this.CLIENT_SECRET,
                'https://developers.google.com/oauthplayground', // Redirect URI
            );

            oauth2Client.setCredentials({
                refresh_token: this.REFRESH_TOKEN,
            });

            this.drive = google.drive({ version: 'v3', auth: oauth2Client });
            this.logger.log('✅ Google Drive OAuth2 đã khởi động!');
        } catch (e) {
            this.logger.error('❌ Lỗi khởi tạo Drive OAuth2:', e.message);
        }
    }

    async uploadFile(localFilePath: string, originalName: string, mimeType: string): Promise<string | null> {
        if (!this.drive) return null;

        try {
            // Tự tạo folder nếu chưa có, hoặc tìm folder hiện có
            let folderId = await this.getOrCreateFolder('AppDiemdanh_Leaves');

            const fileMetadata = {
                name: `${Date.now()}-${originalName}`,
                parents: [folderId],
            };

            const media = {
                mimeType: mimeType || 'image/jpeg',
                body: fs.createReadStream(localFilePath),
            };

            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id',
            });


            const fileId = response.data.id;



            // Cấp quyền xem công khai
            await this.drive.permissions.create({
                fileId: fileId,
                requestBody: { role: 'reader', type: 'anyone' },
            });

            const publicUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
            this.logger.log(`✅ Upload thành công: ${publicUrl}`);



            return publicUrl;
        } catch (error) {
            this.logger.error('❌ Lỗi upload Drive OAuth2:', error.message);
            return null;
        }
    }

    // Tìm hoặc tạo mới folder AppDiemdanh_Leaves trong Drive
    private async getOrCreateFolder(folderName: string): Promise<string> {
        // Tìm folder đã tồn tại
        const search = await this.drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
        });

        if (search.data.files && search.data.files.length > 0) {
            return search.data.files[0].id;
        }

        // Tạo folder mới nếu chưa có
        const folder = await this.drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
        });

        this.logger.log(`📁 Đã tạo folder mới: ${folderName}`);
        return folder.data.id;
    }
}
