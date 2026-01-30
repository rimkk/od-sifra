import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const INVITATION_EXPIRY_DAYS = 7;

export const invitationService = {
  async createInvitation(inviterId: string, email: string, role: UserRole) {
    // Check if inviter has permission
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
    });

    if (!inviter) {
      throw new AppError('Inviter not found', 404);
    }

    // Admin can invite employees and customers
    // Employees can only invite customers
    if (inviter.role === UserRole.EMPLOYEE && role !== UserRole.CUSTOMER) {
      throw new AppError('Employees can only invite customers', 403);
    }

    if (inviter.role === UserRole.CUSTOMER) {
      throw new AppError('Customers cannot send invitations', 403);
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Check for pending invitation
    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvitation) {
      throw new AppError('Pending invitation already exists for this email', 400);
    }

    // Create invitation
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = await prisma.invitation.create({
      data: {
        inviterId,
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return invitation;
  },

  async getInvitationByToken(token: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new AppError('Invitation not found', 404);
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError('Invitation has expired', 400);
    }

    if (invitation.usedAt) {
      throw new AppError('Invitation already used', 400);
    }

    return invitation;
  },

  async getInvitationsByUser(userId: string) {
    return prisma.invitation.findMany({
      where: { inviterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async deleteInvitation(inviterId: string, invitationId: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new AppError('Invitation not found', 404);
    }

    if (invitation.inviterId !== inviterId) {
      throw new AppError('Not authorized to delete this invitation', 403);
    }

    if (invitation.usedAt) {
      throw new AppError('Cannot delete used invitation', 400);
    }

    await prisma.invitation.delete({
      where: { id: invitationId },
    });

    return { success: true };
  },
};
