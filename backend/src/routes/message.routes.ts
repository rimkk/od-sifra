import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { messageService } from '../services/message.service';

const router = Router();

// Get conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await messageService.getConversations(req.user!.id);
    res.json({ conversations });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Get messages with a specific user
router.get(
  '/with/:userId',
  authenticate,
  validate([
    param('userId').isUUID().withMessage('Invalid user ID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await messageService.getMessagesWith(
        req.user!.id,
        req.params.userId,
        page,
        limit
      );
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Send message
router.post(
  '/',
  authenticate,
  validate([
    body('receiverId').isUUID().withMessage('Valid receiver ID required'),
    body('content').trim().notEmpty().withMessage('Message content required'),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const message = await messageService.sendMessage(req.user!.id, req.body);

      // Emit socket event for real-time delivery
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${req.body.receiverId}`).emit('new_message', message);
      }

      res.status(201).json({ message });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Mark message as read
router.put(
  '/:id/read',
  authenticate,
  validate([param('id').isUUID().withMessage('Invalid message ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const message = await messageService.markAsRead(req.params.id, req.user!.id);
      res.json({ message });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Get unread count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const count = await messageService.getUnreadCount(req.user!.id);
    res.json({ unreadCount: count });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
