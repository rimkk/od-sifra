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
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    res.json({ adminExists: !!admin, admin, serverTime: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset admin password (temporary - remove after fixing)
router.post('/reset-admin-password', async (_req: Request, res: Response) => {
  try {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('1234567', 12);
    const admin = await prisma.user.update({
      where: { email: 'moria.mann97@gmail.com' },
      data: { passwordHash },
    });
    res.json({ success: true, message: 'Admin password reset', email: admin.email });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug login (temporary)
router.post('/debug-login', async (req: Request, res: Response) => {
  try {
    const bcrypt = await import('bcryptjs');
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase();
    
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    
    if (!user) {
      return res.json({ 
        step: 'user_lookup', 
        error: 'User not found',
        receivedEmail: email,
        normalizedEmail,
      });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    res.json({
      step: 'password_check',
      receivedEmail: email,
      normalizedEmail,
      userFound: true,
      userEmail: user.email,
      isActive: user.isActive,
      passwordValid: isValid,
      passwordLength: password?.length,
      hashPrefix: user.passwordHash.substring(0, 10),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Register
router.post(
  '/register',
  validate([
    body('email').isEmail().toLowerCase().withMessage('Valid email required'),
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
    body('email').isEmail().toLowerCase().withMessage('Valid email required'),
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
    body('email').isEmail().toLowerCase().withMessage('Valid email required'),
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
