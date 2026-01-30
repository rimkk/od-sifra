import { prisma } from '../lib/prisma';
import { PropertyStatus, UserRole } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreatePropertyData {
  customerAccountId: string;
  address: string;
  city: string;
  postalCode?: string;
  country?: string;
  description?: string;
  purchaseCost: number;
  monthlyRent: number;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  rentalStart?: Date;
  rentalEnd?: Date;
  status?: PropertyStatus;
  imageUrl?: string;
  notes?: string;
}

export interface UpdatePropertyData extends Partial<CreatePropertyData> {}

export const propertyService = {
  async createProperty(data: CreatePropertyData, creatorId: string, creatorRole: UserRole) {
    // Verify customer account exists
    const customerAccount = await prisma.customerAccount.findUnique({
      where: { id: data.customerAccountId },
    });

    if (!customerAccount) {
      throw new AppError('Customer account not found', 404);
    }

    // Only admin or assigned employee can create properties
    if (creatorRole === UserRole.EMPLOYEE) {
      const assignment = await prisma.customerAssignment.findFirst({
        where: {
          customerAccountId: data.customerAccountId,
          employeeId: creatorId,
        },
      });

      if (!assignment) {
        throw new AppError('Not authorized to manage this customer account', 403);
      }
    }

    const property = await prisma.property.create({
      data: {
        ...data,
        purchaseCost: new Decimal(data.purchaseCost),
        monthlyRent: new Decimal(data.monthlyRent),
      },
      include: {
        customerAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return property;
  },

  async getPropertyById(propertyId: string, userId: string, userRole: UserRole) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        customerAccount: {
          select: {
            id: true,
            name: true,
            users: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        renovations: {
          include: {
            steps: {
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        visits: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    // Check access for customers - must belong to the customer account
    if (userRole === UserRole.CUSTOMER) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { customerAccountId: true },
      });
      
      if (!user?.customerAccountId || property.customerAccountId !== user.customerAccountId) {
        throw new AppError('Not authorized to view this property', 403);
      }
    }

    if (userRole === UserRole.EMPLOYEE) {
      const assignment = await prisma.customerAssignment.findFirst({
        where: {
          customerAccountId: property.customerAccountId,
          employeeId: userId,
        },
      });

      if (!assignment) {
        throw new AppError('Not authorized to view this property', 403);
      }
    }

    return property;
  },

  async getPropertiesByCustomerAccount(customerAccountId: string) {
    return prisma.property.findMany({
      where: { customerAccountId },
      include: {
        renovations: {
          where: { status: { not: 'COMPLETED' } },
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Backward compatible method - gets properties for a user by their customer account
  async getPropertiesByCustomer(customerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: { customerAccountId: true },
    });

    if (!user?.customerAccountId) {
      return [];
    }

    return this.getPropertiesByCustomerAccount(user.customerAccountId);
  },

  async getAllProperties(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        skip,
        take: limit,
        include: {
          customerAccount: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.property.count(),
    ]);

    return {
      properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateProperty(
    propertyId: string,
    data: UpdatePropertyData,
    userId: string,
    userRole: UserRole
  ) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
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
        throw new AppError('Not authorized to update this property', 403);
      }
    }

    const updateData: any = { ...data };
    if (data.purchaseCost !== undefined) {
      updateData.purchaseCost = new Decimal(data.purchaseCost);
    }
    if (data.monthlyRent !== undefined) {
      updateData.monthlyRent = new Decimal(data.monthlyRent);
    }

    return prisma.property.update({
      where: { id: propertyId },
      data: updateData,
      include: {
        customerAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async deleteProperty(propertyId: string, userId: string, userRole: UserRole) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new AppError('Property not found', 404);
    }

    // Only admin can delete properties
    if (userRole !== UserRole.ADMIN) {
      throw new AppError('Only admin can delete properties', 403);
    }

    await prisma.property.delete({
      where: { id: propertyId },
    });

    return { success: true };
  },

  async getPropertyFinancialsByAccount(customerAccountId: string) {
    const properties = await prisma.property.findMany({
      where: { customerAccountId },
      select: {
        id: true,
        address: true,
        purchaseCost: true,
        monthlyRent: true,
        status: true,
        rentalStart: true,
      },
    });

    const totalPurchaseCost = properties.reduce(
      (sum, p) => sum + Number(p.purchaseCost),
      0
    );
    const totalMonthlyRent = properties.reduce(
      (sum, p) => sum + (p.status === 'ACTIVE' ? Number(p.monthlyRent) : 0),
      0
    );
    const activeProperties = properties.filter((p) => p.status === 'ACTIVE').length;
    const vacantProperties = properties.filter((p) => p.status === 'VACANT').length;

    return {
      totalProperties: properties.length,
      activeProperties,
      vacantProperties,
      totalPurchaseCost,
      totalMonthlyRent,
      estimatedAnnualIncome: totalMonthlyRent * 12,
      properties: properties.map((p) => ({
        id: p.id,
        address: p.address,
        purchaseCost: Number(p.purchaseCost),
        monthlyRent: Number(p.monthlyRent),
        status: p.status,
      })),
    };
  },

  // Backward compatible method - gets financials for a user by their customer account
  async getPropertyFinancials(customerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: { customerAccountId: true },
    });

    if (!user?.customerAccountId) {
      return {
        totalProperties: 0,
        activeProperties: 0,
        vacantProperties: 0,
        totalPurchaseCost: 0,
        totalMonthlyRent: 0,
        estimatedAnnualIncome: 0,
        properties: [],
      };
    }

    return this.getPropertyFinancialsByAccount(user.customerAccountId);
  },
};
