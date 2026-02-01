import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

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

export default router;
