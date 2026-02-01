import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authService } from '../services/auth.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Debug endpoint to check admin user
router.get('/debug-admin', async (_req: Request, res: Response) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'moria.mann97@gmail.com' },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ adminExists: !!admin, admin });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Register
router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('invitationToken').optional().isString(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Login
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Create initial admin (only works if no admin exists)
router.post(
  '/setup-admin',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;
      const admin = await authService.createAdminUser(email, password, name);
      const token = authService.generateToken(admin.id);
      res.status(201).json({
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        accessToken: token,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

export default router;
