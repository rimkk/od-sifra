import { Router, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
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
        assignedEmployee: {
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
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
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
      // Employee can message their assigned customers and admin
      const assignments = await prisma.customerAssignment.findMany({
        where: { employeeId: user.id },
        include: {
          customer: {
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

      contacts = assignments.map((a) => a.customer);
      if (admin) contacts.unshift(admin);
    } else if (user.role === 'CUSTOMER') {
      // Customer can message their assigned employee and admin
      const assignment = await prisma.customerAssignment.findUnique({
        where: { customerId: user.id },
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

      if (assignment) contacts.push(assignment.employee);
      if (admin) contacts.push(admin);
    }

    res.json({ contacts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
