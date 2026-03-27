import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';

@Controller('messages')
export class MessagesController {
    constructor(
        private readonly messagesService: MessagesService,
        private readonly messagesGateway: MessagesGateway,
    ) { }

    @Post()
    async sendMessage(
        @Body('senderId') senderId: string,
        @Body('receiverId') receiverId: string,
        @Body('text') text: string,
        @Body('isAdmin') isAdmin: boolean,
    ) {
        const savedMessage = await this.messagesService.createMessage(
            senderId,
            receiverId,
            text,
            isAdmin,
        );

        if (isAdmin) {
            this.messagesGateway.emitToUser(receiverId, savedMessage);
            this.messagesGateway.server.to('admins').emit('receiveMessage', savedMessage);
        } else {
            this.messagesGateway.server.to('admins').emit('receiveMessage', savedMessage);
        }

        return savedMessage;
    }

    // API Lấy lịch sử chat chi tiết
    @Get(':employeeId')
    async getChatHistory(@Param('employeeId') employeeId: string) {
        if (!employeeId || employeeId === 'undefined' || employeeId === 'null') return [];
        return this.messagesService.getMessages(employeeId);
    }

    // API 1: Lấy tin nhắn cuối & số lượng chưa đọc cho danh sách bên trái
    // Cách gọi từ Web: GET /messages/admin/summary?ids=ID1,ID2,ID3
    @Get('admin/summary')
    async getSummary(@Query('ids') ids: string) {
        if (!ids) return [];
        const idArray = ids.split(',');
        return this.messagesService.getSummaryForEmployees(idArray);
    }

    // API 2: Đánh dấu đã đọc (Gọi khi sếp click chọn nhân viên để chat)
    @Post('read/:employeeId')
    async readMessages(@Param('employeeId') employeeId: string) {
        await this.messagesService.markAsRead(employeeId);
        return { success: true };
    }
}