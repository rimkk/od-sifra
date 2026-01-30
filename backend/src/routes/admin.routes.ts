import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { adminService } from '../services/admin.service';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require admin or employee authentication
router.use(authenticate);
router.use(authorize([UserRole.ADMIN, UserRole.EMPLOYEE]));

// Get dashboard overview
router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const overview = await adminService.getDashboardOverview();
    res.json({ overview });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all customers
router.get(
  '/customers',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await adminService.getAllCustomers(page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get customer details
router.get(
  '/customers/:id',
  validate([param('id').isUUID().withMessage('Invalid customer ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const customer = await adminService.getCustomerDetails(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json({ customer });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all employees
router.get(
  '/employees',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await adminService.getAllEmployees(page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Assign customer to employee
router.post(
  '/assign-customer',
  validate([
    body('customerId').isUUID().withMessage('Valid customer ID required'),
    body('employeeId').isUUID().withMessage('Valid employee ID required'),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { customerId, employeeId } = req.body;
      const assignment = await adminService.assignCustomerToEmployee(customerId, employeeId);
      res.json({ assignment });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Toggle user active status
router.put(
  '/users/:id/toggle-status',
  validate([param('id').isUUID().withMessage('Invalid user ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await adminService.toggleUserStatus(req.params.id);
      res.json({ user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
