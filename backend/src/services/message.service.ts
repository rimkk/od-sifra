import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export interface SendMessageData {
  receiverId: string;
  content: string;
}

export const messageService = {
  async sendMessage(senderId: string, data: SendMessageData) {
    const { receiverId, content } = data;

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      throw new AppError('Receiver not found', 404);
    }

    // Verify sender can message receiver
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      throw new AppError('Sender not found', 404);
    }

    // Validate messaging permissions
    // Admin can message anyone
    // Employee can message customers (and admin)
    // Customer can message their assigned employee (and admin)
    if (sender.role === UserRole.CUSTOMER && sender.customerAccountId) {
      const assignment = await prisma.customerAssignment.findUnique({
        where: { customerAccountId: sender.customerAccountId },
      });

      if (
        receiver.role !== UserRole.ADMIN &&
        (!assignment || assignment.employeeId !== receiverId)
      ) {
        throw new AppError('You can only message your assigned employee', 403);
      }
    }

    if (sender.role === UserRole.EMPLOYEE && receiver.role === UserRole.EMPLOYEE) {
      throw new AppError('Employees cannot message each other', 403);
    }

    const message = await prisma.message.create({
      data: {
        senderId,
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
        receiver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return message;
  },

  async getConversations(userId: string) {
    // Get all unique conversation partners
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      distinct: ['receiverId'],
      select: { receiverId: true },
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      distinct: ['senderId'],
      select: { senderId: true },
    });

    const partnerIds = new Set([
      ...sentMessages.map((m) => m.receiverId),
      ...receivedMessages.map((m) => m.senderId),
    ]);

    // Get conversation summaries
    const conversations = await Promise.all(
      Array.from(partnerIds).map(async (partnerId) => {
        const partner = await prisma.user.findUnique({
          where: { id: partnerId },
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        });

        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: partnerId },
              { senderId: partnerId, receiverId: userId },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await prisma.message.count({
          where: {
            senderId: partnerId,
            receiverId: userId,
            isRead: false,
          },
        });

        return {
          partner,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by last message date
    return conversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || new Date(0);
      const dateB = b.lastMessage?.createdAt || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  },

  async getMessagesWith(userId: string, partnerId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
        },
      }),
    ]);

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async markAsRead(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.receiverId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    return prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  async getUnreadCount(userId: string) {
    return prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });
  },
};
