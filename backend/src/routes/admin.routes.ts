import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { adminService } from '../services/admin.service';
import { prisma } from '../lib/prisma';
import { UserRole, ApprovalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();

// All routes require admin or employee authentication
router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.EMPLOYEE));

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

// Create employee (Admin only)
router.post(
  '/employees',
  authorize(UserRole.ADMIN),
  validate([
    body('email').isEmail().toLowerCase().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').optional().trim(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, name, phone } = req.body;

      // Check if email already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      
      const employee = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone,
          role: UserRole.EMPLOYEE,
          isActive: true,
          approvalStatus: ApprovalStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: req.user!.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({ employee });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update employee
router.patch(
  '/employees/:id',
  authorize(UserRole.ADMIN),
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('isActive').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, phone, isActive } = req.body;

      const employee = await prisma.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
          ...(isActive !== undefined && { isActive }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
        },
      });

      res.json({ employee });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete employee
router.delete(
  '/employees/:id',
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      // Don't allow deleting yourself
      if (id === req.user!.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await prisma.user.delete({ where: { id } });
      res.json({ success: true });
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
