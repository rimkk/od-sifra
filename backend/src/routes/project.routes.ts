import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole, StageType, ActivityType } from '@prisma/client';

const router = Router();

// Get all projects for a customer account
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let projects;

    if (user.role === UserRole.ADMIN) {
      // Admin sees all projects
      projects = await prisma.project.findMany({
        include: {
          customerAccount: { select: { id: true, name: true } },
          listings: { select: { id: true, stage: true } },
          _count: { select: { listings: true, activities: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else if (user.role === UserRole.EMPLOYEE) {
      // Employee sees projects for their assigned accounts
      const assignments = await prisma.customerAssignment.findMany({
        where: { employeeId: user.id },
        select: { customerAccountId: true },
      });
      const accountIds = assignments.map((a) => a.customerAccountId);

      projects = await prisma.project.findMany({
        where: { customerAccountId: { in: accountIds } },
        include: {
          customerAccount: { select: { id: true, name: true } },
          listings: { select: { id: true, stage: true } },
          _count: { select: { listings: true, activities: true } },
        },
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

    // Add stage counts to each project
    const projectsWithCounts = projects.map((project: any) => {
      const stageCounts: Record<string, number> = {};
      project.listings.forEach((listing: any) => {
        stageCounts[listing.stage] = (stageCounts[listing.stage] || 0) + 1;
      });
      return {
        ...project,
        stageCounts,
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

// Create project
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('customerAccountId').isUUID().withMessage('Valid customer account ID required'),
    body('description').optional().trim(),
    body('targetBudget').optional().isNumeric(),
    body('targetProperties').optional().isInt({ min: 1 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, customerAccountId, description, targetBudget, targetProperties } = req.body;

      const project = await prisma.project.create({
        data: {
          name,
          customerAccountId,
          description,
          targetBudget,
          targetProperties,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          projectId: project.id,
          userId: req.user!.id,
          type: ActivityType.STATUS_CHANGED,
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
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, targetBudget, targetProperties } = req.body;

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(targetBudget !== undefined && { targetBudget }),
          ...(targetProperties !== undefined && { targetProperties }),
        },
      });

      res.json({ project });
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
