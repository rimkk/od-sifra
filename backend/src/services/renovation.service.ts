import { prisma } from '../lib/prisma';
import { RenovationStatus, UserRole } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';
import { notificationService } from './notification.service';

export interface CreateRenovationData {
  propertyId: string;
  title: string;
  description?: string;
  budget?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateStepData {
  title: string;
  description?: string;
  dueDate?: Date;
  orderIndex?: number;
}

// Helper to notify all users in a customer account
async function notifyCustomerAccountUsers(
  customerAccountId: string,
  title: string,
  body: string,
  type: 'STATUS_CHANGE' | 'RENOVATION_UPDATE',
  metadata: Record<string, any>
) {
  const users = await prisma.user.findMany({
    where: { customerAccountId },
    select: { id: true },
  });

  await Promise.all(
    users.map((user) =>
      notificationService.createNotification({
        userId: user.id,
        title,
        body,
        type,
        metadata,
      })
    )
  );
}

export const renovationService = {
  async createRenovation(data: CreateRenovationData, userId: string, userRole: UserRole) {
    // Verify property exists and user has access
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
      include: { customerAccount: true },
    });

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    // Check permission
    if (userRole === UserRole.EMPLOYEE) {
      const assignment = await prisma.customerAssignment.findFirst({
        where: {
          customerAccountId: property.customerAccountId,
          employeeId: userId,
        },
      });

      if (!assignment) {
        throw new AppError('Not authorized to manage this property', 403);
      }
    }

    const renovation = await prisma.renovation.create({
      data: {
        propertyId: data.propertyId,
        title: data.title,
        description: data.description,
        budget: data.budget ? new Decimal(data.budget) : null,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      include: {
        steps: true,
        property: {
          select: {
            address: true,
            customerAccountId: true,
          },
        },
      },
    });

    // Notify all users in the customer account
    await notifyCustomerAccountUsers(
      property.customerAccountId,
      'New Renovation Added',
      `A new renovation "${data.title}" has been added to ${property.address}`,
      'RENOVATION_UPDATE',
      { renovationId: renovation.id, propertyId: property.id }
    );

    return renovation;
  },

  async getRenovationById(renovationId: string, userId: string, userRole: UserRole) {
    const renovation = await prisma.renovation.findUnique({
      where: { id: renovationId },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
        },
        property: {
          include: {
            customerAccount: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!renovation) {
      throw new AppError('Renovation not found', 404);
    }

    // Check access for customer
    if (userRole === UserRole.CUSTOMER) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { customerAccountId: true },
      });

      if (!user?.customerAccountId || renovation.property.customerAccountId !== user.customerAccountId) {
        throw new AppError('Not authorized to view this renovation', 403);
      }
    }

    return renovation;
  },

  async updateRenovation(
    renovationId: string,
    data: Partial<CreateRenovationData> & { status?: RenovationStatus; actualCost?: number },
    userId: string,
    userRole: UserRole
  ) {
    const renovation = await prisma.renovation.findUnique({
      where: { id: renovationId },
      include: { property: true },
    });

    if (!renovation) {
      throw new AppError('Renovation not found', 404);
    }

    // Check permission
    if (userRole === UserRole.CUSTOMER) {
      throw new AppError('Customers cannot update renovations', 403);
    }

    if (userRole === UserRole.EMPLOYEE) {
      const assignment = await prisma.customerAssignment.findFirst({
        where: {
          customerAccountId: renovation.property.customerAccountId,
          employeeId: userId,
        },
      });

      if (!assignment) {
        throw new AppError('Not authorized to update this renovation', 403);
      }
    }

    const updateData: any = { ...data };
    if (data.budget !== undefined) {
      updateData.budget = new Decimal(data.budget);
    }
    if (data.actualCost !== undefined) {
      updateData.actualCost = new Decimal(data.actualCost);
    }
    delete updateData.propertyId;

    const updated = await prisma.renovation.update({
      where: { id: renovationId },
      data: updateData,
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
        },
        property: {
          select: {
            address: true,
            customerAccountId: true,
          },
        },
      },
    });

    // Notify customer account users of status change
    if (data.status && data.status !== renovation.status) {
      await notifyCustomerAccountUsers(
        renovation.property.customerAccountId,
        'Renovation Status Updated',
        `Renovation "${renovation.title}" is now ${data.status.toLowerCase().replace('_', ' ')}`,
        'STATUS_CHANGE',
        { renovationId, status: data.status }
      );
    }

    return updated;
  },

  async addStep(renovationId: string, data: CreateStepData, userId: string, userRole: UserRole) {
    const renovation = await prisma.renovation.findUnique({
      where: { id: renovationId },
      include: { property: true, steps: true },
    });

    if (!renovation) {
      throw new AppError('Renovation not found', 404);
    }

    // Check permission
    if (userRole === UserRole.CUSTOMER) {
      throw new AppError('Customers cannot add renovation steps', 403);
    }

    const orderIndex = data.orderIndex ?? renovation.steps.length;

    const step = await prisma.renovationStep.create({
      data: {
        renovationId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        orderIndex,
      },
    });

    return step;
  },

  async updateStep(
    stepId: string,
    data: Partial<CreateStepData> & { status?: RenovationStatus },
    userId: string,
    userRole: UserRole
  ) {
    const step = await prisma.renovationStep.findUnique({
      where: { id: stepId },
      include: {
        renovation: {
          include: { property: true },
        },
      },
    });

    if (!step) {
      throw new AppError('Step not found', 404);
    }

    // Check permission
    if (userRole === UserRole.CUSTOMER) {
      throw new AppError('Customers cannot update renovation steps', 403);
    }

    const updateData: any = { ...data };
    if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.renovationStep.update({
      where: { id: stepId },
      data: updateData,
    });

    // Notify customer account users
    if (data.status && data.status !== step.status) {
      await notifyCustomerAccountUsers(
        step.renovation.property.customerAccountId,
        'Renovation Step Updated',
        `Step "${step.title}" is now ${data.status.toLowerCase().replace('_', ' ')}`,
        'RENOVATION_UPDATE',
        { stepId, renovationId: step.renovationId }
      );
    }

    return updated;
  },

  async deleteStep(stepId: string, userId: string, userRole: UserRole) {
    const step = await prisma.renovationStep.findUnique({
      where: { id: stepId },
      include: {
        renovation: {
          include: { property: true },
        },
      },
    });

    if (!step) {
      throw new AppError('Step not found', 404);
    }

    if (userRole !== UserRole.ADMIN) {
      throw new AppError('Only admin can delete steps', 403);
    }

    await prisma.renovationStep.delete({
      where: { id: stepId },
    });

    return { success: true };
  },

  async getRenovationsByProperty(propertyId: string) {
    return prisma.renovation.findMany({
      where: { propertyId },
      include: {
        steps: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
