import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

interface CreateCustomerAccountInput {
  accountName: string;
  description?: string;
  // Primary user details (optional - can create account without user)
  primaryUser?: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  };
}

interface AddUserToAccountInput {
  customerAccountId: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface InviteToAccountInput {
  customerAccountId: string;
  emails: string[];
  inviterId: string;
}

export const customerAccountsService = {
  // Create a new customer account with optional primary user
  async createAccount(input: CreateCustomerAccountInput, createdById?: string) {
    const { accountName, description, primaryUser } = input;

    return prisma.$transaction(async (tx) => {
      // Create the customer account
      const customerAccount = await tx.customerAccount.create({
        data: {
          name: accountName,
          description,
        },
      });

      let user = null;

      // If primary user details provided, create the user
      if (primaryUser) {
        // Check if email already exists
        const existingUser = await tx.user.findUnique({
          where: { email: primaryUser.email },
        });

        if (existingUser) {
          throw new Error('A user with this email already exists');
        }

        const passwordHash = await bcrypt.hash(primaryUser.password, 12);

        user = await tx.user.create({
          data: {
            email: primaryUser.email,
            passwordHash,
            name: primaryUser.name,
            phone: primaryUser.phone,
            role: 'CUSTOMER',
            customerAccountId: customerAccount.id,
            invitedById: createdById,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        });
      }

      return {
        customerAccount,
        user,
      };
    });
  },

  // Add a user directly to an existing customer account
  async addUserToAccount(input: AddUserToAccountInput, addedById?: string) {
    const { customerAccountId, email, password, name, phone } = input;

    // Verify the account exists
    const account = await prisma.customerAccount.findUnique({
      where: { id: customerAccountId },
    });

    if (!account) {
      throw new Error('Customer account not found');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        role: 'CUSTOMER',
        customerAccountId,
        invitedById: addedById,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        customerAccountId: true,
        createdAt: true,
      },
    });

    return user;
  },

  // Create invitations for multiple emails to join a customer account
  async inviteToAccount(input: InviteToAccountInput) {
    const { customerAccountId, emails, inviterId } = input;
    const { v4: uuidv4 } = await import('uuid');

    // Verify the account exists
    const account = await prisma.customerAccount.findUnique({
      where: { id: customerAccountId },
    });

    if (!account) {
      throw new Error('Customer account not found');
    }

    // Create invitations for each email
    const invitations = await Promise.all(
      emails.map(async (email) => {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return { email, error: 'User already exists', invitation: null };
        }

        // Check for existing pending invitation
        const existingInvitation = await prisma.invitation.findFirst({
          where: {
            email,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
        });

        if (existingInvitation) {
          return { email, error: 'Pending invitation already exists', invitation: null };
        }

        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invitation = await prisma.invitation.create({
          data: {
            inviterId,
            email,
            role: 'CUSTOMER',
            customerAccountId,
            token,
            expiresAt,
          },
        });

        return { email, error: null, invitation };
      })
    );

    return {
      customerAccount: account,
      invitations,
    };
  },

  // Get all customer accounts
  async getAllAccounts() {
    const accounts = await prisma.customerAccount.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
        properties: {
          select: {
            id: true,
            address: true,
            city: true,
            monthlyRent: true,
            status: true,
          },
        },
        _count: {
          select: {
            users: true,
            properties: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts;
  },

  // Get a single customer account by ID
  async getAccountById(id: string) {
    const account = await prisma.customerAccount.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        properties: {
          include: {
            renovations: true,
          },
        },
        assignments: {
          include: {
            employee: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return account;
  },

  // Update customer account
  async updateAccount(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    const account = await prisma.customerAccount.update({
      where: { id },
      data,
    });

    return account;
  },

  // Remove a user from a customer account
  async removeUserFromAccount(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        customerAccountId: null,
        isActive: false,
      },
    });

    return user;
  },
};
