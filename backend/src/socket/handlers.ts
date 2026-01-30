import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const secret = process.env.JWT_SECRET || 'default-secret';
      const decoded = jwt.verify(token, secret) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room for direct messages
    socket.join(`user:${socket.userId}`);

    // Handle sending messages
    socket.on('send_message', async (data: { receiverId: string; content: string }) => {
      try {
        const { receiverId, content } = data;

        // Create message in database
        const message = await prisma.message.create({
          data: {
            senderId: socket.userId!,
            receiverId,
            content,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        });

        // Send to receiver
        io.to(`user:${receiverId}`).emit('new_message', message);

        // Confirm to sender
        socket.emit('message_sent', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data: { receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit('user_typing', {
        userId: socket.userId,
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data: { receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit('user_stop_typing', {
        userId: socket.userId,
      });
    });

    // Handle message read
    socket.on('mark_read', async (data: { messageId: string }) => {
      try {
        const message = await prisma.message.update({
          where: { id: data.messageId },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        // Notify sender that message was read
        io.to(`user:${message.senderId}`).emit('message_read', {
          messageId: message.id,
          readAt: message.readAt,
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};
