import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole, StageType, ActivityType, TaskStatus, TaskPriority } from '@prisma/client';

const router = Router();

// Get single listing with details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.propertyListing.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, customerAccountId: true } },
        tasks: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create listing
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    body('projectId').isUUID().withMessage('Valid project ID required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('stage').optional().isIn(Object.values(StageType)),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        projectId,
        address,
        city,
        state,
        zipCode,
        country,
        stage,
        askingPrice,
        estimatedRent,
        propertyType,
        bedrooms,
        bathrooms,
        sqft,
        yearBuilt,
        listingUrl,
        imageUrl,
        notes,
      } = req.body;

      // Get max order index for the stage
      const maxOrder = await prisma.propertyListing.aggregate({
        where: { projectId, stage: stage || StageType.SEARCHING },
        _max: { orderIndex: true },
      });

      const listing = await prisma.propertyListing.create({
        data: {
          projectId,
          address,
          city,
          state,
          zipCode,
          country: country || 'USA',
          stage: stage || StageType.SEARCHING,
          orderIndex: (maxOrder._max.orderIndex || 0) + 1,
          askingPrice,
          estimatedRent,
          propertyType,
          bedrooms,
          bathrooms,
          sqft,
          yearBuilt,
          listingUrl,
          imageUrl,
          notes,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          projectId,
          userId: req.user!.id,
          type: ActivityType.PROPERTY_ADDED,
          title: 'Property added',
          description: `${address}, ${city} was added to the board`,
          metadata: { listingId: listing.id, address, city },
        },
      });

      res.status(201).json({ listing });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update listing
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Get current listing for activity log
      const currentListing = await prisma.propertyListing.findUnique({
        where: { id },
        select: { projectId: true, stage: true, address: true, city: true },
      });

      if (!currentListing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      const listing = await prisma.propertyListing.update({
        where: { id },
        data: updateData,
      });

      // Log stage change
      if (updateData.stage && updateData.stage !== currentListing.stage) {
        await prisma.activity.create({
          data: {
            projectId: currentListing.projectId,
            userId: req.user!.id,
            type: ActivityType.PROPERTY_MOVED,
            title: 'Property moved',
            description: `${currentListing.address} moved from ${currentListing.stage} to ${updateData.stage}`,
            metadata: {
              listingId: id,
              fromStage: currentListing.stage,
              toStage: updateData.stage,
            },
          },
        });
      } else if (Object.keys(updateData).length > 0) {
        await prisma.activity.create({
          data: {
            projectId: currentListing.projectId,
            userId: req.user!.id,
            type: ActivityType.PROPERTY_UPDATED,
            title: 'Property updated',
            description: `${currentListing.address} was updated`,
            metadata: { listingId: id, fields: Object.keys(updateData) },
          },
        });
      }

      res.json({ listing });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Move listing to different stage
router.post(
  '/:id/move',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    param('id').isUUID(),
    body('stage').isIn(Object.values(StageType)).withMessage('Valid stage required'),
    body('orderIndex').optional().isInt({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { stage, orderIndex } = req.body;

      const currentListing = await prisma.propertyListing.findUnique({
        where: { id },
        select: { projectId: true, stage: true, address: true },
      });

      if (!currentListing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Calculate new order index if not provided
      let newOrderIndex = orderIndex;
      if (newOrderIndex === undefined) {
        const maxOrder = await prisma.propertyListing.aggregate({
          where: { projectId: currentListing.projectId, stage },
          _max: { orderIndex: true },
        });
        newOrderIndex = (maxOrder._max.orderIndex || 0) + 1;
      }

      const listing = await prisma.propertyListing.update({
        where: { id },
        data: { stage, orderIndex: newOrderIndex },
      });

      // Log activity
      if (stage !== currentListing.stage) {
        await prisma.activity.create({
          data: {
            projectId: currentListing.projectId,
            userId: req.user!.id,
            type: ActivityType.PROPERTY_MOVED,
            title: 'Property moved',
            description: `${currentListing.address} moved to ${stage}`,
            metadata: {
              listingId: id,
              fromStage: currentListing.stage,
              toStage: stage,
            },
          },
        });
      }

      res.json({ listing });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete listing
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const listing = await prisma.propertyListing.findUnique({
        where: { id },
        select: { projectId: true, address: true, city: true },
      });

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      await prisma.propertyListing.delete({ where: { id } });

      // Log activity
      await prisma.activity.create({
        data: {
          projectId: listing.projectId,
          userId: req.user!.id,
          type: ActivityType.STATUS_CHANGED,
          title: 'Property removed',
          description: `${listing.address}, ${listing.city} was removed`,
        },
      });

      res.json({ message: 'Listing deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Add task to listing
router.post(
  '/:id/tasks',
  authenticate,
  validate([
    param('id').isUUID(),
    body('title').trim().notEmpty().withMessage('Task title required'),
    body('priority').optional().isIn(Object.values(TaskPriority)),
    body('dueDate').optional().isISO8601(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, priority, dueDate, assignedToId } = req.body;

      const listing = await prisma.propertyListing.findUnique({
        where: { id },
        select: { projectId: true, address: true },
      });

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      const task = await prisma.task.create({
        data: {
          propertyListingId: id,
          title,
          description,
          priority: priority || TaskPriority.MEDIUM,
          dueDate: dueDate ? new Date(dueDate) : null,
          assignedToId,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          projectId: listing.projectId,
          userId: req.user!.id,
          type: ActivityType.TASK_CREATED,
          title: 'Task created',
          description: `"${title}" added to ${listing.address}`,
          metadata: { listingId: id, taskId: task.id },
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
  '/tasks/:taskId',
  authenticate,
  validate([param('taskId').isUUID()]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      const { title, description, status, priority, dueDate } = req.body;

      const currentTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: { propertyListing: { select: { projectId: true, address: true } } },
      });

      if (!currentTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
          ...(priority && { priority }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(status === TaskStatus.DONE && { completedAt: new Date() }),
        },
      });

      // Log task completion
      if (status === TaskStatus.DONE && currentTask.status !== TaskStatus.DONE) {
        await prisma.activity.create({
          data: {
            projectId: currentTask.propertyListing.projectId,
            userId: req.user!.id,
            type: ActivityType.TASK_COMPLETED,
            title: 'Task completed',
            description: `"${currentTask.title}" completed for ${currentTask.propertyListing.address}`,
            metadata: { taskId },
          },
        });
      }

      res.json({ task });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Add comment to listing
router.post(
  '/:id/comments',
  authenticate,
  validate([
    param('id').isUUID(),
    body('content').trim().notEmpty().withMessage('Comment content required'),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      const listing = await prisma.propertyListing.findUnique({
        where: { id },
        select: { projectId: true, address: true },
      });

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      const comment = await prisma.comment.create({
        data: {
          propertyListingId: id,
          userId: req.user!.id,
          content,
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          projectId: listing.projectId,
          userId: req.user!.id,
          type: ActivityType.COMMENT_ADDED,
          title: 'Comment added',
          description: `New comment on ${listing.address}`,
          metadata: { listingId: id, commentId: comment.id },
        },
      });

      res.status(201).json({ comment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
