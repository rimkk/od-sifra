import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { propertyService } from '../services/property.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Get all properties (admin) or own properties (customer)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (user.role === UserRole.CUSTOMER) {
      const properties = await propertyService.getPropertiesByCustomer(user.id);
      res.json({ properties });
    } else {
      const result = await propertyService.getAllProperties(page, limit);
      res.json(result);
    }
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// Get property by ID
router.get(
  '/:id',
  authenticate,
  validate([param('id').isUUID().withMessage('Invalid property ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const property = await propertyService.getPropertyById(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.json({ property });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Create property (admin/employee only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    body('customerAccountId').isUUID().withMessage('Valid customer account ID required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('purchaseCost').isFloat({ min: 0 }).withMessage('Valid purchase cost required'),
    body('monthlyRent').isFloat({ min: 0 }).withMessage('Valid monthly rent required'),
    body('postalCode').optional().trim(),
    body('country').optional().trim(),
    body('description').optional().trim(),
    body('tenantName').optional().trim(),
    body('tenantEmail').optional().isEmail(),
    body('tenantPhone').optional().trim(),
    body('rentalStart').optional().isISO8601(),
    body('rentalEnd').optional().isISO8601(),
    body('status').optional().isIn(['ACTIVE', 'VACANT', 'RENOVATION', 'SOLD']),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const property = await propertyService.createProperty(
        req.body,
        req.user!.id,
        req.user!.role
      );
      res.status(201).json({ property });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Update property
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    param('id').isUUID().withMessage('Invalid property ID'),
    body('address').optional().trim().notEmpty(),
    body('city').optional().trim().notEmpty(),
    body('purchaseCost').optional().isFloat({ min: 0 }),
    body('monthlyRent').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['ACTIVE', 'VACANT', 'RENOVATION', 'SOLD']),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const property = await propertyService.updateProperty(
        req.params.id,
        req.body,
        req.user!.id,
        req.user!.role
      );
      res.json({ property });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Delete property (admin only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([param('id').isUUID().withMessage('Invalid property ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      await propertyService.deleteProperty(req.params.id, req.user!.id, req.user!.role);
      res.json({ message: 'Property deleted' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Get financial summary for customer
router.get(
  '/customer/:customerId/financials',
  authenticate,
  validate([param('customerId').isUUID().withMessage('Invalid customer ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { customerId } = req.params;

      // Customers can only view their own financials
      if (user.role === UserRole.CUSTOMER && user.id !== customerId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const financials = await propertyService.getPropertyFinancials(customerId);
      res.json({ financials });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

export default router;
