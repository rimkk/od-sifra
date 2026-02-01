import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserRole, InviteStatus } from '@prisma/client';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Login
router.post(
  '/login',
  validate([
    body('email').isEmail().toLowerCase().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          workspaces: {
            where: { isActive: true },
            include: { workspace: { select: { id: true, name: true, slug: true } } },
          },
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: 'Account is disabled' });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = generateToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          workspaces: user.workspaces.map((m) => ({
            ...m.workspace,
            role: m.role,
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Register (with optional invite token)
router.post(
  '/register',
  validate([
    body('email').isEmail().toLowerCase().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('inviteToken').optional().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name, inviteToken } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      let invite = null;
      let workspaceId: string | null = null;
      let role: UserRole = UserRole.CUSTOMER;

      // Handle invite token
      if (inviteToken) {
        invite = await prisma.invite.findUnique({
          where: { token: inviteToken },
          include: { workspace: true },
        });

        if (!invite) {
          return res.status(400).json({ error: 'Invalid invite token' });
        }

        if (invite.status !== InviteStatus.PENDING) {
          return res.status(400).json({ error: 'Invite is no longer valid' });
        }

        if (new Date() > invite.expiresAt) {
          return res.status(400).json({ error: 'Invite has expired' });
        }

        if (invite.email !== email) {
          return res.status(400).json({ error: 'Email does not match invite' });
        }

        workspaceId = invite.workspaceId;
        role = invite.role;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role,
          emailVerified: !!invite, // Auto-verify if using invite
          ...(workspaceId && {
            workspaces: {
              create: { workspaceId, role },
            },
          }),
        },
        include: {
          workspaces: {
            include: { workspace: { select: { id: true, name: true, slug: true } } },
          },
        },
      });

      // Mark invite as accepted
      if (invite) {
        await prisma.invite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.ACCEPTED, acceptedAt: new Date() },
        });
      }

      const token = generateToken(user.id);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          workspaces: user.workspaces.map((m) => ({
            ...m.workspace,
            role: m.role,
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        workspaces: {
          where: { isActive: true },
          include: { workspace: { select: { id: true, name: true, slug: true, logoUrl: true } } },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        role: user.role,
        workspaces: user.workspaces.map((m) => ({
          ...m.workspace,
          role: m.role,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.patch(
  '/me',
  authenticate,
  validate([
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('avatarUrl').optional().trim(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: req.body,
        select: { id: true, email: true, name: true, avatarUrl: true, phone: true, role: true },
      });

      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Change password
router.post(
  '/change-password',
  authenticate,
  validate([
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { passwordHash },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Setup admin (first-time setup)
router.post(
  '/setup',
  validate([
    body('email').isEmail().toLowerCase(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('workspaceName').trim().notEmpty(),
    body('workspaceSlug').trim().notEmpty().matches(/^[a-z0-9-]+$/),
  ]),
  async (req: Request, res: Response) => {
    try {
      // Check if any admin exists
      const existingAdmin = await prisma.user.findFirst({
        where: { role: UserRole.OWNER_ADMIN },
      });

      if (existingAdmin) {
        return res.status(400).json({ error: 'Setup already completed' });
      }

      const { email, password, name, workspaceName, workspaceSlug } = req.body;

      // Check slug
      const existingWorkspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
      if (existingWorkspace) {
        return res.status(400).json({ error: 'Workspace slug already taken' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // Create user, workspace, and membership in transaction
      const result = await prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            slug: workspaceSlug,
          },
        });

        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name,
            role: UserRole.OWNER_ADMIN,
            emailVerified: true,
            workspaces: {
              create: { workspaceId: workspace.id, role: UserRole.OWNER_ADMIN },
            },
          },
        });

        return { user, workspace };
      });

      const token = generateToken(result.user.id);

      res.status(201).json({
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          workspaces: [{ ...result.workspace, role: UserRole.OWNER_ADMIN }],
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Check if setup is needed
router.get('/setup-status', async (req: Request, res: Response) => {
  try {
    const adminExists = await prisma.user.findFirst({
      where: { role: UserRole.OWNER_ADMIN },
    });

    res.json({ setupRequired: !adminExists });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
