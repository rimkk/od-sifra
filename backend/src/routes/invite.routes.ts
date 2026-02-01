import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole, InviteStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const router = Router();

// Generate invite token
function generateToken() {
  return randomBytes(32).toString('hex');
}

// Create invite (authenticated)
router.post(
  '/',
  authenticate,
  validate([
    body('workspaceId').isUUID(),
    body('email').isEmail().toLowerCase(),
    body('role').isIn(['EMPLOYEE', 'CUSTOMER']),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, email, role } = req.body;

      // Check workspace membership and permissions
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
      });

      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Only admins can invite employees
      if (role === UserRole.EMPLOYEE && membership.role !== UserRole.OWNER_ADMIN) {
        return res.status(403).json({ error: 'Only admins can invite employees' });
      }

      // Customers can't invite anyone
      if (membership.role === UserRole.CUSTOMER) {
        return res.status(403).json({ error: 'Customers cannot send invites' });
      }

      // Check if user already exists and is member
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        const existingMember = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
        });
        if (existingMember) {
          return res.status(400).json({ error: 'User is already a member of this workspace' });
        }
      }

      // Check for existing pending invite
      const existingInvite = await prisma.invite.findFirst({
        where: { workspaceId, email, status: InviteStatus.PENDING },
      });
      if (existingInvite) {
        return res.status(400).json({ error: 'Invite already sent to this email' });
      }

      // Create invite (expires in 7 days)
      const invite = await prisma.invite.create({
        data: {
          workspaceId,
          email,
          role: role as UserRole,
          token: generateToken(),
          invitedById: req.user!.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        include: {
          workspace: { select: { name: true } },
          invitedBy: { select: { name: true } },
        },
      });

      // TODO: Send email with invite link
      console.log(`Invite link: /invite/${invite.token}`);

      res.status(201).json({ invite });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get invite by token (public)
router.get('/token/:token', async (req, res: Response) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token },
      include: {
        workspace: { select: { id: true, name: true, logoUrl: true } },
        invitedBy: { select: { name: true } },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.status !== InviteStatus.PENDING) {
      return res.status(400).json({ error: 'Invite is no longer valid', status: invite.status });
    }

    if (new Date() > invite.expiresAt) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      return res.status(400).json({ error: 'Invite has expired' });
    }

    res.json({ invite });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get workspace invites (authenticated)
router.get(
  '/workspace/:workspaceId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
      });

      if (!membership || membership.role === UserRole.CUSTOMER) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const invites = await prisma.invite.findMany({
        where: { workspaceId },
        include: { invitedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ invites });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Cancel invite
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const invite = await prisma.invite.findUnique({
        where: { id: req.params.id },
      });

      if (!invite) {
        return res.status(404).json({ error: 'Invite not found' });
      }

      // Check workspace access
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: req.user!.id } },
      });

      if (!membership || membership.role === UserRole.CUSTOMER) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.invite.update({
        where: { id: req.params.id },
        data: { status: InviteStatus.CANCELLED },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Resend invite
router.post(
  '/:id/resend',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const invite = await prisma.invite.findUnique({
        where: { id: req.params.id },
      });

      if (!invite) {
        return res.status(404).json({ error: 'Invite not found' });
      }

      // Check workspace access
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: req.user!.id } },
      });

      if (!membership || membership.role === UserRole.CUSTOMER) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update with new token and expiry
      const updated = await prisma.invite.update({
        where: { id: req.params.id },
        data: {
          token: generateToken(),
          status: InviteStatus.PENDING,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // TODO: Send email
      console.log(`Resent invite link: /invite/${updated.token}`);

      res.json({ invite: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
