import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole, RenovationStatus } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.EMPLOYEE));

// Get all tasks for a renovation (board view)
router.get('/renovation/:renovationId', async (req: AuthRequest, res: Response) => {
  try {
    const { renovationId } = req.params;

    const renovation = await prisma.renovation.findUnique({
      where: { id: renovationId },
      include: {
        property: { select: { id: true, address: true, city: true, customerAccount: { select: { name: true } } } },
      },
    });

    if (!renovation) {
      return res.status(404).json({ error: 'Renovation not found' });
    }

    const tasks = await prisma.renovationTask.findMany({
      where: { renovationId },
      include: {
        contractor: { select: { id: true, name: true, specialty: true } },
        _count: { select: { materials: true, timeEntries: true } },
      },
      orderBy: [{ status: 'asc' }, { orderIndex: 'asc' }],
    });

    // Calculate totals
    const totals = await prisma.renovationTask.aggregate({
      where: { renovationId },
      _sum: {
        estimatedCost: true,
        actualCost: true,
        laborCost: true,
        materialCost: true,
        estimatedHours: true,
        actualHours: true,
      },
    });

    // Group by status for board view
    const byStatus: Record<string, typeof tasks> = {
      PLANNED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    tasks.forEach((task) => {
      if (byStatus[task.status]) {
        byStatus[task.status].push(task);
      }
    });

    res.json({
      renovation,
      tasks,
      byStatus,
      totals: {
        estimatedCost: totals._sum.estimatedCost || 0,
        actualCost: totals._sum.actualCost || 0,
        laborCost: totals._sum.laborCost || 0,
        materialCost: totals._sum.materialCost || 0,
        estimatedHours: totals._sum.estimatedHours || 0,
        actualHours: totals._sum.actualHours || 0,
      },
      taskCount: tasks.length,
      completedCount: byStatus.COMPLETED.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single task with details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.renovationTask.findUnique({
      where: { id: req.params.id },
      include: {
        contractor: true,
        materials: { orderBy: { createdAt: 'desc' } },
        timeEntries: {
          include: { contractor: { select: { name: true } } },
          orderBy: { date: 'desc' },
        },
        renovation: {
          select: { id: true, title: true, property: { select: { address: true } } },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post(
  '/',
  validate([
    body('renovationId').isUUID().withMessage('Renovation ID required'),
    body('title').trim().notEmpty().withMessage('Title required'),
    body('description').optional().trim(),
    body('contractorId').optional().isUUID(),
    body('status').optional().isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('category').optional().trim(),
    body('estimatedCost').optional().isFloat({ min: 0 }),
    body('estimatedHours').optional().isFloat({ min: 0 }),
    body('startDate').optional().isISO8601(),
    body('dueDate').optional().isISO8601(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { renovationId, ...data } = req.body;

      // Get max order index
      const maxOrder = await prisma.renovationTask.aggregate({
        where: { renovationId },
        _max: { orderIndex: true },
      });

      const task = await prisma.renovationTask.create({
        data: {
          renovationId,
          ...data,
          orderIndex: (maxOrder._max.orderIndex || 0) + 1,
        },
        include: {
          contractor: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ task });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update task
router.patch(
  '/:id',
  validate([
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('contractorId').optional(),
    body('status').optional().isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('category').optional().trim(),
    body('estimatedCost').optional().isFloat({ min: 0 }),
    body('actualCost').optional().isFloat({ min: 0 }),
    body('laborCost').optional().isFloat({ min: 0 }),
    body('materialCost').optional().isFloat({ min: 0 }),
    body('estimatedHours').optional().isFloat({ min: 0 }),
    body('actualHours').optional().isFloat({ min: 0 }),
    body('progress').optional().isInt({ min: 0, max: 100 }),
    body('startDate').optional().isISO8601(),
    body('dueDate').optional().isISO8601(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = { ...req.body };

      // Set completedAt when marking as completed
      if (data.status === 'COMPLETED' && !data.completedAt) {
        data.completedAt = new Date();
        data.progress = 100;
      }

      const task = await prisma.renovationTask.update({
        where: { id },
        data,
        include: {
          contractor: { select: { id: true, name: true } },
        },
      });

      res.json({ task });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Move task (change status/order)
router.post(
  '/:id/move',
  validate([
    body('status').isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    body('orderIndex').optional().isInt({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, orderIndex } = req.body;

      const data: any = { status };
      if (orderIndex !== undefined) data.orderIndex = orderIndex;
      if (status === 'COMPLETED') {
        data.completedAt = new Date();
        data.progress = 100;
      }

      const task = await prisma.renovationTask.update({
        where: { id },
        data,
      });

      res.json({ task });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete task
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.renovationTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// === Materials ===

// Add material to task
router.post(
  '/:taskId/materials',
  validate([
    body('name').trim().notEmpty(),
    body('quantity').isFloat({ min: 0 }),
    body('unit').optional().trim(),
    body('unitPrice').isFloat({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      const { name, quantity, unit, unitPrice, notes } = req.body;
      const totalPrice = quantity * unitPrice;

      const material = await prisma.materialItem.create({
        data: {
          taskId,
          name,
          quantity,
          unit,
          unitPrice,
          totalPrice,
          notes,
        },
      });

      // Update task material cost
      const materialTotal = await prisma.materialItem.aggregate({
        where: { taskId },
        _sum: { totalPrice: true },
      });

      await prisma.renovationTask.update({
        where: { id: taskId },
        data: { materialCost: materialTotal._sum.totalPrice || 0 },
      });

      res.status(201).json({ material });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update material
router.patch('/materials/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const material = await prisma.materialItem.findUnique({ where: { id } });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const { quantity, unitPrice, isPurchased, ...rest } = req.body;
    const data: any = { ...rest };

    if (quantity !== undefined) data.quantity = quantity;
    if (unitPrice !== undefined) data.unitPrice = unitPrice;
    if (quantity !== undefined || unitPrice !== undefined) {
      data.totalPrice = (quantity ?? material.quantity) * (unitPrice ?? Number(material.unitPrice));
    }
    if (isPurchased !== undefined) {
      data.isPurchased = isPurchased;
      if (isPurchased) data.purchasedAt = new Date();
    }

    const updated = await prisma.materialItem.update({ where: { id }, data });

    // Update task material cost
    const materialTotal = await prisma.materialItem.aggregate({
      where: { taskId: material.taskId },
      _sum: { totalPrice: true },
    });

    await prisma.renovationTask.update({
      where: { id: material.taskId },
      data: { materialCost: materialTotal._sum.totalPrice || 0 },
    });

    res.json({ material: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete material
router.delete('/materials/:id', async (req: AuthRequest, res: Response) => {
  try {
    const material = await prisma.materialItem.findUnique({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ error: 'Material not found' });

    await prisma.materialItem.delete({ where: { id: req.params.id } });

    // Update task material cost
    const materialTotal = await prisma.materialItem.aggregate({
      where: { taskId: material.taskId },
      _sum: { totalPrice: true },
    });

    await prisma.renovationTask.update({
      where: { id: material.taskId },
      data: { materialCost: materialTotal._sum.totalPrice || 0 },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// === Time Entries ===

// Add time entry
router.post(
  '/:taskId/time',
  validate([
    body('hours').isFloat({ min: 0 }),
    body('date').isISO8601(),
    body('contractorId').optional().isUUID(),
    body('description').optional().trim(),
    body('hourlyRate').optional().isFloat({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      const { hours, date, contractorId, description, hourlyRate } = req.body;

      // Get contractor rate if not provided
      let rate = hourlyRate;
      if (!rate && contractorId) {
        const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
        rate = contractor?.hourlyRate ? Number(contractor.hourlyRate) : null;
      }

      const totalCost = rate ? hours * rate : null;

      const entry = await prisma.timeEntry.create({
        data: {
          taskId,
          contractorId,
          hours,
          date: new Date(date),
          description,
          hourlyRate: rate,
          totalCost,
        },
        include: { contractor: { select: { name: true } } },
      });

      // Update task hours and labor cost
      const timeStats = await prisma.timeEntry.aggregate({
        where: { taskId },
        _sum: { hours: true, totalCost: true },
      });

      await prisma.renovationTask.update({
        where: { id: taskId },
        data: {
          actualHours: timeStats._sum.hours || 0,
          laborCost: timeStats._sum.totalCost || 0,
        },
      });

      res.status(201).json({ entry });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete time entry
router.delete('/time/:id', async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    await prisma.timeEntry.delete({ where: { id: req.params.id } });

    // Update task hours and labor cost
    const timeStats = await prisma.timeEntry.aggregate({
      where: { taskId: entry.taskId },
      _sum: { hours: true, totalCost: true },
    });

    await prisma.renovationTask.update({
      where: { id: entry.taskId },
      data: {
        actualHours: timeStats._sum.hours || 0,
        laborCost: timeStats._sum.totalCost || 0,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
