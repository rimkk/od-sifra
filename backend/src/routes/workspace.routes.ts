import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();

router.use(authenticate);

// Get all workspaces for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.id, isActive: true },
      include: {
        workspace: {
          include: {
            _count: { select: { boards: true, members: true } },
          },
        },
      },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      memberRole: m.role,
    }));

    res.json({ workspaces });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single workspace
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check membership
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: req.user!.id } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } },
        },
        _count: { select: { boards: true } },
      },
    });

    res.json({ workspace, memberRole: membership.role });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create workspace (Admin only)
router.post(
  '/',
  authorize(UserRole.OWNER_ADMIN),
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('slug').trim().notEmpty().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase with hyphens'),
    body('description').optional().trim(),
    body('defaultCurrency').optional().isIn(['USD', 'ILS', 'EUR', 'GBP']),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, slug, description, defaultCurrency } = req.body;

      // Check slug uniqueness
      const existing = await prisma.workspace.findUnique({ where: { slug } });
      if (existing) {
        return res.status(400).json({ error: 'Slug already taken' });
      }

      const workspace = await prisma.workspace.create({
        data: {
          name,
          slug,
          description,
          defaultCurrency: defaultCurrency || 'USD',
          members: {
            create: { userId: req.user!.id, role: UserRole.OWNER_ADMIN },
          },
        },
        include: { members: true },
      });

      res.status(201).json({ workspace });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update workspace
router.patch(
  '/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('defaultCurrency').optional().isIn(['USD', 'ILS', 'EUR', 'GBP']),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Check admin access
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: req.user!.id } },
      });

      if (!membership || (membership.role !== UserRole.OWNER_ADMIN && membership.role !== UserRole.EMPLOYEE)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const workspace = await prisma.workspace.update({
        where: { id },
        data: req.body,
      });

      res.json({ workspace });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get workspace members
router.get('/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: req.user!.id } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id, isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true, phone: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ members });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member from workspace
router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    // Check admin access
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: req.user!.id } },
    });

    if (!membership || membership.role !== UserRole.OWNER_ADMIN) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Can't remove yourself
    if (userId === req.user!.id) {
      return res.status(400).json({ error: "Can't remove yourself" });
    }

    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: id, userId } },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add member directly (create user if doesn't exist)
router.post(
  '/:id/members',
  validate([
    param('id').isUUID(),
    body('email').isEmail().toLowerCase(),
    body('name').trim().notEmpty(),
    body('role').isIn(['EMPLOYEE', 'CUSTOMER']),
    body('phone').optional().trim(),
    body('password').optional().isLength({ min: 6 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: workspaceId } = req.params;
      const { email, name, role, phone, password } = req.body;

      // Check workspace admin access
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
      });

      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Only admins can add employees
      if (role === UserRole.EMPLOYEE && membership.role !== UserRole.OWNER_ADMIN) {
        return res.status(403).json({ error: 'Only admins can add employees' });
      }

      // Customers can't add anyone
      if (membership.role === UserRole.CUSTOMER) {
        return res.status(403).json({ error: 'Customers cannot add members' });
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        // Check if already a member
        const existingMember = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: user.id } },
        });

        if (existingMember && existingMember.isActive) {
          return res.status(400).json({ error: 'User is already a member of this workspace' });
        }

        // Re-activate if was deactivated
        if (existingMember && !existingMember.isActive) {
          await prisma.workspaceMember.update({
            where: { workspaceId_userId: { workspaceId, userId: user.id } },
            data: { isActive: true, role: role as UserRole },
          });
        } else {
          // Add to workspace
          await prisma.workspaceMember.create({
            data: {
              workspaceId,
              userId: user.id,
              role: role as UserRole,
            },
          });
        }
      } else {
        // Create new user
        const passwordHash = await bcrypt.hash(password || 'Welcome123!', 12);
        
        user = await prisma.user.create({
          data: {
            email,
            name,
            phone,
            passwordHash,
            role: role as UserRole,
            emailVerified: true, // Admin-created accounts are pre-verified
            workspaces: {
              create: { workspaceId, role: role as UserRole },
            },
          },
        });
      }

      // Fetch the member with user details
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true, role: true } },
        },
      });

      // Create notification for the new member
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Welcome!',
          message: `You have been added to workspace by ${req.user!.name}`,
          link: '/dashboard',
        },
      });

      res.status(201).json({ 
        member,
        isNewUser: !user.passwordHash || password ? true : false,
        temporaryPassword: !user.passwordHash ? 'Welcome123!' : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update member role
router.patch(
  '/:id/members/:userId',
  validate([
    param('id').isUUID(),
    param('userId').isUUID(),
    body('role').optional().isIn(['EMPLOYEE', 'CUSTOMER']),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: workspaceId, userId } = req.params;
      const { role } = req.body;

      // Check admin access
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
      });

      if (!membership || membership.role !== UserRole.OWNER_ADMIN) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Can't change your own role
      if (userId === req.user!.id) {
        return res.status(400).json({ error: "Can't change your own role" });
      }

      const targetMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });

      if (!targetMember) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Can't demote another admin
      if (targetMember.role === UserRole.OWNER_ADMIN) {
        return res.status(400).json({ error: "Can't change an admin's role" });
      }

      const updated = await prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId } },
        data: { role: role as UserRole },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true, role: true } },
        },
      });

      // Also update user's global role
      await prisma.user.update({
        where: { id: userId },
        data: { role: role as UserRole },
      });

      res.json({ member: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get single member
router.get('/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { id: workspaceId, userId } = req.params;

    // Check workspace access
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true, role: true } },
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ member });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
