import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { UserRole, ApprovalStatus, NotificationType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  invitationToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  async register(data: RegisterData) {
    const { email, password, name, phone, invitationToken } = data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    let role: UserRole = UserRole.CUSTOMER;
    let inviterId: string | null = null;
    let customerAccountId: string | null = null;
    let approvalStatus: ApprovalStatus = ApprovalStatus.PENDING;

    // Handle invitation-based registration
    if (invitationToken) {
      const invitation = await prisma.invitation.findUnique({
        where: { token: invitationToken },
      });

      if (!invitation) {
        throw new AppError('Invalid invitation token', 400);
      }

      if (invitation.expiresAt < new Date()) {
        throw new AppError('Invitation has expired', 400);
      }

      if (invitation.usedAt) {
        throw new AppError('Invitation already used', 400);
      }

      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        throw new AppError('Email does not match invitation', 400);
      }

      role = invitation.role;
      inviterId = invitation.inviterId;
      customerAccountId = invitation.customerAccountId;
      approvalStatus = ApprovalStatus.APPROVED; // Invited users are auto-approved

      // Mark invitation as used
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone,
        role,
        invitedById: inviterId,
        customerAccountId: customerAccountId,
        approvalStatus,
        approvedAt: approvalStatus === ApprovalStatus.APPROVED ? new Date() : null,
        approvedById: inviterId, // If invited, the inviter is the approver
      },
    });

    // If customer was invited by employee and has a customer account, create assignment
    if (role === UserRole.CUSTOMER && inviterId && customerAccountId) {
      const inviter = await prisma.user.findUnique({
        where: { id: inviterId },
      });

      // Check if assignment already exists for this account
      const existingAssignment = await prisma.customerAssignment.findUnique({
        where: { customerAccountId: customerAccountId },
      });

      if (inviter?.role === UserRole.EMPLOYEE && !existingAssignment) {
        await prisma.customerAssignment.create({
          data: {
            customerAccountId: customerAccountId,
            employeeId: inviterId,
          },
        });
      }
    }

    // If self-registered (pending), notify admins
    if (approvalStatus === ApprovalStatus.PENDING) {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      // Create notification for each admin
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'New User Pending Approval',
          body: `${name} (${email}) has requested access to the platform.`,
          type: NotificationType.USER_PENDING_APPROVAL,
          metadata: { userId: user.id, userName: name, userEmail: email },
        })),
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          approvalStatus: user.approvalStatus,
        },
        pendingApproval: true,
      };
    }

    // Generate tokens only for approved users
    const accessToken = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
      accessToken,
      pendingApproval: false,
    };
  },

  async login(data: LoginData) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // Check approval status
    if (user.approvalStatus === ApprovalStatus.PENDING) {
      throw new AppError('Your account is pending approval', 403);
    }

    if (user.approvalStatus === ApprovalStatus.REJECTED) {
      throw new AppError('Your account access was denied', 403);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        approvalStatus: user.approvalStatus,
      },
      accessToken,
    };
  },

  generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  },

  async createAdminUser(email: string, password: string, name: string) {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (existingAdmin) {
      throw new AppError('Admin user already exists', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: UserRole.ADMIN,
        approvalStatus: ApprovalStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    return admin;
  },
};
