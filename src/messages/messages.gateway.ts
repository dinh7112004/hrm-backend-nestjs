// src/messages/messages.gateway.ts
import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Lưu trữ userId -> socketId
    private activeUsers = new Map<string, string>();

    constructor(private readonly messagesService: MessagesService) { }

    // --- HÀM GỬI DANH SÁCH ONLINE CHO CÁC SẾP ---
    private emitOnlineUsers() {
        const onlineIds = Array.from(this.activeUsers.keys());
        // Chỉ bắn danh sách này cho những ai ở trong phòng 'admins' (các sếp)
        this.server.to('admins').emit('getOnlineUsers', onlineIds);
    }

    handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;
        const isAdmin = client.handshake.query.isAdmin === 'true';

        if (userId && userId !== 'undefined') {
            this.activeUsers.set(userId, client.id);

            if (isAdmin) {
                client.join('admins');
                console.log(`🟢 Admin [${userId}] online và đã vào phòng Trực ban`);
            } else {
                console.log(`🟢 Nhân viên [${userId}] online`);
            }

            // Mỗi khi có người mới vào, cập nhật ngay danh sách online cho các sếp
            this.emitOnlineUsers();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = [...this.activeUsers.entries()].find(([_, socketId]) => socketId === client.id)?.[0];
        if (userId) {
            this.activeUsers.delete(userId);
            console.log(`🔴 User [${userId}] offline`);

            // Cập nhật lại danh sách online sau khi có người thoát
            this.emitOnlineUsers();
        }
    }

    // Bắn tin cho 1 user cụ thể (thường dùng cho nhân viên)
    emitToUser(receiverId: string, message: any) {
        const socketId = this.activeUsers.get(receiverId);
        if (socketId) {
            this.server.to(socketId).emit('receiveMessage', message);
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() payload: { senderId: string; receiverId: string; text: string; isAdmin: boolean },
        @ConnectedSocket() client: Socket,
    ) {
        // 1. Lưu DB thông qua Service
        const savedMessage = await this.messagesService.createMessage(
            payload.senderId,
            payload.receiverId,
            payload.text,
            payload.isAdmin,
        );

        // 2. PHÂN PHỐI TIN NHẮN REAL-TIME
        if (!payload.isAdmin) {
            /** * NHÂN VIÊN GỬI LÊN:
             * Bắn cho phòng 'admins' để tất cả sếp nhận được.
             * Frontend Web dựa vào tin nhắn này để đưa nhân viên lên đầu danh sách.
             */
            this.server.to('admins').emit('receiveMessage', savedMessage);
            console.log(`📩 Tin từ nhân viên -> Đã báo cho toàn bộ Admin`);
        } else {
            /** * SẾP GỬI XUỐNG:
             * - Bắn cho đúng nhân viên nhận tin.
             * - Bắn cho các sếp khác để đồng bộ màn hình chat (cùng thấy sếp kia đã rep).
             */
            this.emitToUser(payload.receiverId, savedMessage);
            this.server.to('admins').emit('receiveMessage', savedMessage);
            console.log(`📩 Tin từ sếp -> Đã đồng bộ nhân viên và các sếp khác`);
        }

        // Báo lại cho chính người gửi là tin đã đi thành công
        client.emit('messageSent', savedMessage);
        return savedMessage;
    }
}