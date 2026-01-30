import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { customerAccountsService } from '../services/customerAccounts';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create a new customer account (Admin/Employee only)
router.post(
  '/',
  authorize(['ADMIN', 'EMPLOYEE']),
  [
    body('accountName').notEmpty().withMessage('Account name is required'),
    body('description').optional().isString(),
    body('primaryUser').optional().isObject(),
    body('primaryUser.email').optional().isEmail().withMessage('Valid email required'),
    body('primaryUser.password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('primaryUser.name').optional().notEmpty().withMessage('Name is required'),
    body('primaryUser.phone').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await customerAccountsService.createAccount(req.body, req.user!.id);
      res.status(201).json({
        message: 'Customer account created successfully',
        ...result,
      });
    } catch (error: any) {
      if (error.message === 'A user with this email already exists') {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Get all customer accounts (Admin/Employee only)
router.get(
  '/',
  authorize(['ADMIN', 'EMPLOYEE']),
  async (req, res, next) => {
    try {
      const accounts = await customerAccountsService.getAllAccounts();
      res.json({ accounts });
    } catch (error) {
      next(error);
    }
  }
);

// Get a single customer account
router.get(
  '/:id',
  authorize(['ADMIN', 'EMPLOYEE']),
  [param('id').isUUID().withMessage('Valid account ID required')],
  validate,
  async (req, res, next) => {
    try {
      const account = await customerAccountsService.getAccountById(req.params.id);
      if (!account) {
        return res.status(404).json({ error: 'Customer account not found' });
      }
      res.json({ account });
    } catch (error) {
      next(error);
    }
  }
);

// Update a customer account
router.patch(
  '/:id',
  authorize(['ADMIN', 'EMPLOYEE']),
  [
    param('id').isUUID().withMessage('Valid account ID required'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const account = await customerAccountsService.updateAccount(req.params.id, req.body);
      res.json({ message: 'Account updated', account });
    } catch (error) {
      next(error);
    }
  }
);

// Add a user directly to an account (Admin/Employee only)
router.post(
  '/:id/users',
  authorize(['ADMIN', 'EMPLOYEE']),
  [
    param('id').isUUID().withMessage('Valid account ID required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await customerAccountsService.addUserToAccount(
        {
          customerAccountId: req.params.id,
          ...req.body,
        },
        req.user!.id
      );
      res.status(201).json({ message: 'User added to account', user });
    } catch (error: any) {
      if (error.message === 'A user with this email already exists' || error.message === 'Customer account not found') {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Invite multiple users to an account (Admin/Employee only)
router.post(
  '/:id/invite',
  authorize(['ADMIN', 'EMPLOYEE']),
  [
    param('id').isUUID().withMessage('Valid account ID required'),
    body('emails').isArray({ min: 1 }).withMessage('At least one email is required'),
    body('emails.*').isEmail().withMessage('All emails must be valid'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await customerAccountsService.inviteToAccount({
        customerAccountId: req.params.id,
        emails: req.body.emails,
        inviterId: req.user!.id,
      });

      const baseUrl = process.env.APP_URL || 'http://localhost:3001';
      const invitationsWithLinks = result.invitations.map((inv) => ({
        ...inv,
        link: inv.invitation ? `${baseUrl}/register?token=${inv.invitation.token}` : null,
      }));

      res.json({
        message: 'Invitations created',
        customerAccount: result.customerAccount,
        invitations: invitationsWithLinks,
      });
    } catch (error: any) {
      if (error.message === 'Customer account not found') {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
);

// Remove a user from an account
router.delete(
  '/:id/users/:userId',
  authorize(['ADMIN', 'EMPLOYEE']),
  [
    param('id').isUUID().withMessage('Valid account ID required'),
    param('userId').isUUID().withMessage('Valid user ID required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      await customerAccountsService.removeUserFromAccount(req.params.userId);
      res.json({ message: 'User removed from account' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
