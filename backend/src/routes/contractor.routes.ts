import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.EMPLOYEE));

// Get all contractors
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const contractors = await prisma.contractor.findMany({
      include: {
        _count: { select: { tasks: true, timeEntries: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate total hours and earnings for each contractor
    const contractorsWithStats = await Promise.all(
      contractors.map(async (c) => {
        const stats = await prisma.timeEntry.aggregate({
          where: { contractorId: c.id },
          _sum: { hours: true, totalCost: true },
        });
        return {
          ...c,
          totalHours: stats._sum.hours || 0,
          totalEarnings: stats._sum.totalCost || 0,
        };
      })
    );

    res.json({ contractors: contractorsWithStats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single contractor
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const contractor = await prisma.contractor.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          include: {
            renovation: { select: { id: true, title: true, property: { select: { address: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        timeEntries: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Get stats
    const stats = await prisma.timeEntry.aggregate({
      where: { contractorId: contractor.id },
      _sum: { hours: true, totalCost: true },
    });

    res.json({
      contractor: {
        ...contractor,
        totalHours: stats._sum.hours || 0,
        totalEarnings: stats._sum.totalCost || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create contractor
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
    body('company').optional().trim(),
    body('specialty').optional().trim(),
    body('hourlyRate').optional().isFloat({ min: 0 }),
    body('notes').optional().trim(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const contractor = await prisma.contractor.create({
        data: req.body,
      });
      res.status(201).json({ contractor });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update contractor
router.patch(
  '/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
    body('company').optional().trim(),
    body('specialty').optional().trim(),
    body('hourlyRate').optional().isFloat({ min: 0 }),
    body('notes').optional().trim(),
    body('isActive').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const contractor = await prisma.contractor.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json({ contractor });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete contractor
router.delete('/:id', authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.contractor.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
