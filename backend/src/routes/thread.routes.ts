import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

// Get user's threads
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const threads = await prisma.messageThread.findMany({
      where: {
        participants: { some: { userId: req.user!.id } },
      },
      include: {
        participants: {
          include: { },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get participant details and unread counts
    const threadsWithDetails = await Promise.all(
      threads.map(async (thread) => {
        const participantIds = thread.participants.map((p) => p.userId);
        const participants = await prisma.user.findMany({
          where: { id: { in: participantIds } },
          select: { id: true, name: true, avatarUrl: true },
        });

        const myParticipant = thread.participants.find((p) => p.userId === req.user!.id);
        const unreadCount = await prisma.message.count({
          where: {
            threadId: thread.id,
            createdAt: { gt: myParticipant?.lastReadAt || new Date(0) },
            senderId: { not: req.user!.id },
          },
        });

        return {
          ...thread,
          participantUsers: participants,
          unreadCount,
          lastMessage: thread.messages[0] || null,
          messages: undefined,
        };
      })
    );

    res.json({ threads: threadsWithDetails });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single thread with messages
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is participant
    const participant = await prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId: id, userId: req.user!.id } },
    });

    if (!participant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const thread = await prisma.messageThread.findUnique({
      where: { id },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        },
        workspace: { select: { id: true, name: true } },
      },
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Get participant users
    const participantIds = thread.participants.map((p) => p.userId);
    const participantUsers = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, name: true, avatarUrl: true, email: true },
    });

    // Mark as read
    await prisma.threadParticipant.update({
      where: { threadId_userId: { threadId: id, userId: req.user!.id } },
      data: { lastReadAt: new Date() },
    });

    res.json({ thread: { ...thread, participantUsers } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create thread
router.post(
  '/',
  validate([
    body('workspaceId').isUUID(),
    body('participantIds').isArray().notEmpty(),
    body('title').optional().trim(),
    body('initialMessage').optional().trim(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, participantIds, title, initialMessage } = req.body;

      // Check workspace membership
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
      });

      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Ensure all participants are workspace members
      const allParticipantIds = [...new Set([req.user!.id, ...participantIds])];

      // Check for existing 1:1 thread
      if (allParticipantIds.length === 2) {
        const existingThread = await prisma.messageThread.findFirst({
          where: {
            workspaceId,
            isGroup: false,
            AND: allParticipantIds.map((userId) => ({
              participants: { some: { userId } },
            })),
          },
          include: { participants: true },
        });

        if (existingThread && existingThread.participants.length === 2) {
          return res.json({ thread: existingThread, existing: true });
        }
      }

      const thread = await prisma.messageThread.create({
        data: {
          workspaceId,
          title,
          isGroup: allParticipantIds.length > 2,
          participants: {
            create: allParticipantIds.map((userId) => ({
              userId,
              lastReadAt: userId === req.user!.id ? new Date() : null,
            })),
          },
          ...(initialMessage && {
            messages: {
              create: {
                senderId: req.user!.id,
                content: initialMessage,
              },
            },
          }),
        },
        include: {
          participants: true,
          messages: { include: { sender: { select: { id: true, name: true, avatarUrl: true } } } },
        },
      });

      // Notify participants
      for (const userId of participantIds) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'MESSAGE_RECEIVED',
            title: 'New Message',
            message: initialMessage ? `${req.user!.name}: ${initialMessage.substring(0, 50)}...` : `${req.user!.name} started a conversation`,
            link: `/messages/${thread.id}`,
          },
        });
      }

      res.status(201).json({ thread });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Send message
router.post(
  '/:id/messages',
  validate([body('content').trim().notEmpty()]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // Check if user is participant
      const participant = await prisma.threadParticipant.findUnique({
        where: { threadId_userId: { threadId: id, userId: req.user!.id } },
      });

      if (!participant) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const message = await prisma.message.create({
        data: {
          threadId: id,
          senderId: req.user!.id,
          content,
        },
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
      });

      // Update thread updatedAt
      await prisma.messageThread.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      // Update sender's lastReadAt
      await prisma.threadParticipant.update({
        where: { threadId_userId: { threadId: id, userId: req.user!.id } },
        data: { lastReadAt: new Date() },
      });

      // Notify other participants
      const otherParticipants = await prisma.threadParticipant.findMany({
        where: { threadId: id, userId: { not: req.user!.id } },
      });

      for (const p of otherParticipants) {
        await prisma.notification.create({
          data: {
            userId: p.userId,
            type: 'MESSAGE_RECEIVED',
            title: 'New Message',
            message: `${req.user!.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            link: `/messages/${id}`,
          },
        });
      }

      res.status(201).json({ message });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Mark thread as read
router.post('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.threadParticipant.update({
      where: { threadId_userId: { threadId: req.params.id, userId: req.user!.id } },
      data: { lastReadAt: new Date() },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
