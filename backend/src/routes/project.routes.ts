import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole, StageType, ActivityType, ProjectStatus } from '@prisma/client';

const router = Router();

// Get employees (for owner selection)
router.get('/employees', authenticate, authorize(UserRole.ADMIN, UserRole.EMPLOYEE), async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.ADMIN, UserRole.EMPLOYEE] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ employees });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all projects for a customer account
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let projects;

    const projectInclude = {
      customerAccount: { select: { id: true, name: true, email: true, phone: true } },
      listings: { select: { id: true, stage: true } },
      _count: { select: { listings: true, activities: true } },
    };

    if (user.role === UserRole.ADMIN) {
      // Admin sees all projects
      projects = await prisma.project.findMany({
        include: projectInclude,
        orderBy: { updatedAt: 'desc' },
      });
    } else if (user.role === UserRole.EMPLOYEE) {
      // Employee sees projects for their assigned accounts + projects they own
      const assignments = await prisma.customerAssignment.findMany({
        where: { employeeId: user.id },
        select: { customerAccountId: true },
      });
      const accountIds = assignments.map((a) => a.customerAccountId);

      projects = await prisma.project.findMany({
        where: {
          OR: [
            { customerAccountId: { in: accountIds } },
            { ownerId: user.id },
          ],
        },
        include: projectInclude,
        orderBy: { updatedAt: 'desc' },
      });
    } else {
      // Customer sees their own projects
      if (!user.customerAccountId) {
        return res.json({ projects: [] });
      }
      projects = await prisma.project.findMany({
        where: { customerAccountId: user.customerAccountId },
        include: {
          listings: { select: { id: true, stage: true } },
          _count: { select: { listings: true, activities: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    // Get owner names for projects
    const ownerIds = projects.filter((p: any) => p.ownerId).map((p: any) => p.ownerId);
    const owners = ownerIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true },
    }) : [];
    const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o.name]));

    // Add stage counts and owner name to each project
    const projectsWithCounts = projects.map((project: any) => {
      const stageCounts: Record<string, number> = {};
      project.listings.forEach((listing: any) => {
        stageCounts[listing.stage] = (stageCounts[listing.stage] || 0) + 1;
      });
      return {
        ...project,
        stageCounts,
        ownerName: project.ownerId ? ownerMap[project.ownerId] : null,
        listings: undefined, // Remove raw listings
      };
    });

    res.json({ projects: projectsWithCounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project with all listings
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        customerAccount: { select: { id: true, name: true } },
        listings: {
          include: {
            tasks: true,
            _count: { select: { comments: true, documents: true } },
          },
          orderBy: [{ stage: 'asc' }, { orderIndex: 'asc' }],
        },
        activities: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate financials
    const financials = {
      totalListings: project.listings.length,
      byStage: {} as Record<string, number>,
      totalAskingPrice: 0,
      totalPurchasePrice: 0,
      totalEstimatedRent: 0,
      totalActualRent: 0,
      purchasedCount: 0,
    };

    project.listings.forEach((listing) => {
      financials.byStage[listing.stage] = (financials.byStage[listing.stage] || 0) + 1;
      if (listing.askingPrice) financials.totalAskingPrice += Number(listing.askingPrice);
      if (listing.purchasePrice) financials.totalPurchasePrice += Number(listing.purchasePrice);
      if (listing.estimatedRent) financials.totalEstimatedRent += Number(listing.estimatedRent);
      if (listing.actualRent) financials.totalActualRent += Number(listing.actualRent);
      if (listing.stage === 'PURCHASED' || listing.stage === 'MANAGING') {
        financials.purchasedCount++;
      }
    });

    res.json({ project, financials });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create project (optionally create new customer account inline)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('customerAccountId').optional().isUUID().withMessage('Valid customer account ID'),
    // New customer account fields (used if customerAccountId not provided)
    body('newCustomer.name').optional().trim().notEmpty(),
    body('newCustomer.email').optional().isEmail(),
    body('newCustomer.phone').optional().trim(),
    body('description').optional().trim(),
    body('targetBudget').optional().isNumeric(),
    body('targetProperties').optional().isInt({ min: 1 }),
    body('ownerId').optional().isUUID(),
    body('status').optional().isIn(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, customerAccountId, newCustomer, description, targetBudget, targetProperties, ownerId, status } = req.body;

      let finalCustomerAccountId = customerAccountId;

      // Create new customer account if needed
      if (!customerAccountId && newCustomer?.name) {
        const newAccount = await prisma.customerAccount.create({
          data: {
            name: newCustomer.name,
            email: newCustomer.email,
            phone: newCustomer.phone,
            ownerId: ownerId || req.user!.id,
          },
        });
        finalCustomerAccountId = newAccount.id;
      }

      if (!finalCustomerAccountId) {
        return res.status(400).json({ error: 'Either customerAccountId or newCustomer is required' });
      }

      const project = await prisma.project.create({
        data: {
          name,
          customerAccountId: finalCustomerAccountId,
          description,
          targetBudget,
          targetProperties,
          ownerId: ownerId || req.user!.id, // Default to creator
          status: status || ProjectStatus.ACTIVE,
        },
        include: {
          customerAccount: { select: { id: true, name: true } },
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          projectId: project.id,
          userId: req.user!.id,
          type: ActivityType.PROJECT_CREATED,
          title: 'Project created',
          description: `Project "${name}" was created`,
        },
      });

      res.status(201).json({ project });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update project
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('targetBudget').optional().isNumeric(),
    body('targetProperties').optional().isInt({ min: 1 }),
    body('ownerId').optional().isUUID(),
    body('status').optional().isIn(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
    body('startDate').optional().isISO8601(),
    body('targetEndDate').optional().isISO8601(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, targetBudget, targetProperties, ownerId, status, startDate, targetEndDate } = req.body;

      const oldProject = await prisma.project.findUnique({ where: { id } });

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(targetBudget !== undefined && { targetBudget }),
          ...(targetProperties !== undefined && { targetProperties }),
          ...(ownerId !== undefined && { ownerId }),
          ...(status && { status }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(targetEndDate && { targetEndDate: new Date(targetEndDate) }),
        },
        include: {
          customerAccount: { select: { id: true, name: true } },
        },
      });

      // Log status change
      if (status && oldProject?.status !== status) {
        await prisma.activity.create({
          data: {
            projectId: id,
            userId: req.user!.id,
            type: ActivityType.STATUS_CHANGED,
            title: 'Project status changed',
            description: `Status changed from ${oldProject?.status} to ${status}`,
          },
        });
      }

      res.json({ project });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete project
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.project.delete({ where: { id } });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get project activities
router.get('/:id/activities', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;

    const activities = await prisma.activity.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({ activities });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
