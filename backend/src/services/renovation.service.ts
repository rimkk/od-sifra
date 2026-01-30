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

export const renovationService = {
  async createRenovation(data: CreateRenovationData, userId: string, userRole: UserRole) {
    // Verify property exists and user has access
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
      include: { customer: true },
    });

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    // Check permission
    if (userRole === UserRole.EMPLOYEE) {
      const assignment = await prisma.customerAssignment.findFirst({
        where: {
          customerId: property.customerId,
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
            customerId: true,
          },
        },
      },
    });

    // Notify customer
    await notificationService.createNotification({
      userId: property.customerId,
      title: 'New Renovation Added',
      body: `A new renovation "${data.title}" has been added to ${property.address}`,
      type: 'RENOVATION_UPDATE',
      metadata: { renovationId: renovation.id, propertyId: property.id },
    });

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
            customer: {
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

    // Check access
    if (userRole === UserRole.CUSTOMER && renovation.property.customerId !== userId) {
      throw new AppError('Not authorized to view this renovation', 403);
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
          customerId: renovation.property.customerId,
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
            customerId: true,
          },
        },
      },
    });

    // Notify customer of status change
    if (data.status && data.status !== renovation.status) {
      await notificationService.createNotification({
        userId: renovation.property.customerId,
        title: 'Renovation Status Updated',
        body: `Renovation "${renovation.title}" is now ${data.status.toLowerCase().replace('_', ' ')}`,
        type: 'STATUS_CHANGE',
        metadata: { renovationId, status: data.status },
      });
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

    // Notify customer
    if (data.status && data.status !== step.status) {
      await notificationService.createNotification({
        userId: step.renovation.property.customerId,
        title: 'Renovation Step Updated',
        body: `Step "${step.title}" is now ${data.status.toLowerCase().replace('_', ' ')}`,
        type: 'RENOVATION_UPDATE',
        metadata: { stepId, renovationId: step.renovationId },
      });
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
