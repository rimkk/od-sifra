import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole, ApprovalStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
        customerAccountId: true,
        customerAccount: {
          select: {
            id: true,
            name: true,
            assignments: {
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put(
  '/me',
  authenticate,
  validate([
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().trim(),
    body('avatarUrl').optional().isURL().withMessage('Invalid avatar URL'),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, phone, avatarUrl } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
          ...(avatarUrl !== undefined && { avatarUrl }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatarUrl: true,
        },
      });

      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Change password
router.put(
  '/me/password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: req.user!.id },
        data: { passwordHash },
      });

      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Register push token
router.post(
  '/push-token',
  authenticate,
  validate([
    body('token').notEmpty().withMessage('Push token required'),
    body('platform').isIn(['ios', 'android']).withMessage('Platform must be ios or android'),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { token, platform } = req.body;

      await prisma.pushToken.upsert({
        where: { token },
        update: { userId: req.user!.id },
        create: {
          userId: req.user!.id,
          token,
          platform,
        },
      });

      res.json({ message: 'Push token registered' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get messaging contacts
router.get('/contacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let contacts: any[] = [];

    if (user.role === 'ADMIN') {
      // Admin can message all employees and customers
      contacts = await prisma.user.findMany({
        where: {
          role: { in: ['EMPLOYEE', 'CUSTOMER'] },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      });
    } else if (user.role === 'EMPLOYEE') {
      // Employee can message users from their assigned customer accounts and admin
      const assignments = await prisma.customerAssignment.findMany({
        where: { employeeId: user.id },
        include: {
          customerAccount: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      });

      // Flatten all users from assigned customer accounts
      contacts = assignments.flatMap((a) => a.customerAccount.users);
      if (admin) contacts.unshift(admin);
    } else if (user.role === 'CUSTOMER') {
      // Customer can message their assigned employee and admin
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { customerAccountId: true },
      });

      if (currentUser?.customerAccountId) {
        const assignment = await prisma.customerAssignment.findUnique({
          where: { customerAccountId: currentUser.customerAccountId },
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        });

        if (assignment) contacts.push(assignment.employee);
      }

      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN', isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      });

      if (admin) contacts.push(admin);
    }

    res.json({ contacts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending users (Admin only)
router.get(
  '/pending',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const pendingUsers = await prisma.user.findMany({
        where: { approvalStatus: ApprovalStatus.PENDING },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ users: pendingUsers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Approve user (Admin only)
router.post(
  '/:userId/approve',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([param('userId').isUUID().withMessage('Invalid user ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.approvalStatus !== ApprovalStatus.PENDING) {
        return res.status(400).json({ error: 'User is not pending approval' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: req.user!.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          approvalStatus: true,
        },
      });

      // Notify the user
      await prisma.notification.create({
        data: {
          userId: userId,
          title: 'Account Approved',
          body: 'Your account has been approved. You can now sign in.',
          type: NotificationType.SYSTEM,
        },
      });

      res.json({ user: updatedUser, message: 'User approved successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Reject user (Admin only)
router.post(
  '/:userId/reject',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([param('userId').isUUID().withMessage('Invalid user ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.approvalStatus !== ApprovalStatus.PENDING) {
        return res.status(400).json({ error: 'User is not pending approval' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: ApprovalStatus.REJECTED,
          approvedById: req.user!.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          approvalStatus: true,
        },
      });

      res.json({ user: updatedUser, message: 'User rejected' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all users (Admin only)
router.get(
  '/all',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          approvalStatus: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
