import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { renovationService } from '../services/renovation.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Get renovation by ID
router.get(
  '/:id',
  authenticate,
  validate([param('id').isUUID().withMessage('Invalid renovation ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const renovation = await renovationService.getRenovationById(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.json({ renovation });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Create renovation
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    body('propertyId').isUUID().withMessage('Valid property ID required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('budget').optional().isFloat({ min: 0 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const renovation = await renovationService.createRenovation(
        req.body,
        req.user!.id,
        req.user!.role
      );
      res.status(201).json({ renovation });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Update renovation
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    param('id').isUUID().withMessage('Invalid renovation ID'),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    body('budget').optional().isFloat({ min: 0 }),
    body('actualCost').optional().isFloat({ min: 0 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const renovation = await renovationService.updateRenovation(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role
      );
      res.json({ renovation });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Add step to renovation
router.post(
  '/:id/steps',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    param('id').isUUID().withMessage('Invalid renovation ID'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('dueDate').optional().isISO8601(),
    body('orderIndex').optional().isInt({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const step = await renovationService.addStep(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role
      );
      res.status(201).json({ step });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Update step
router.put(
  '/steps/:stepId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    param('stepId').isUUID().withMessage('Invalid step ID'),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    body('dueDate').optional().isISO8601(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const step = await renovationService.updateStep(
        req.params.stepId,
        req.body,
        req.user!.id,
        req.user!.role
      );
      res.json({ step });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Delete step
router.delete(
  '/steps/:stepId',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([param('stepId').isUUID().withMessage('Invalid step ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      await renovationService.deleteStep(req.params.stepId, req.user!.id, req.user!.role);
      res.json({ message: 'Step deleted' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Get renovations by property
router.get(
  '/property/:propertyId',
  authenticate,
  validate([param('propertyId').isUUID().withMessage('Invalid property ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const renovations = await renovationService.getRenovationsByProperty(req.params.propertyId);
      res.json({ renovations });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

export default router;
