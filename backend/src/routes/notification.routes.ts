import { Router, Response } from 'express';
import { param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { notificationService } from '../services/notification.service';

const router = Router();

// Get notifications
router.get(
  '/',
  authenticate,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await notificationService.getNotifications(req.user!.id, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Mark notification as read
router.put(
  '/:id/read',
  authenticate,
  validate([param('id').isUUID().withMessage('Invalid notification ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const notification = await notificationService.markAsRead(req.params.id, req.user!.id);
      res.json({ notification });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Mark all as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.json({ unreadCount: count });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Delete notification
router.delete(
  '/:id',
  authenticate,
  validate([param('id').isUUID().withMessage('Invalid notification ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      await notificationService.deleteNotification(req.params.id, req.user!.id);
      res.json({ message: 'Notification deleted' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

export default router;
