import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

export const adminService = {
  async getDashboardOverview() {
    const [
      totalCustomers,
      totalEmployees,
      totalProperties,
      activeProperties,
      recentCustomers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      prisma.user.count({ where: { role: UserRole.EMPLOYEE } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: 'ACTIVE' } }),
      prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate total rent from active properties
    const rentData = await prisma.property.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { monthlyRent: true },
    });

    const totalMonthlyRent = Number(rentData._sum.monthlyRent) || 0;

    return {
      totalCustomers,
      totalEmployees,
      totalProperties,
      activeProperties,
      vacantProperties: totalProperties - activeProperties,
      totalMonthlyRent,
      estimatedAnnualRevenue: totalMonthlyRent * 12,
      recentCustomers,
    };
  },

  async getAllCustomers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          invitedBy: {
            select: {
              id: true,
              name: true,
            },
          },
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
          properties: {
            select: {
              id: true,
              monthlyRent: true,
              status: true,
            },
          },
        },
      }),
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
    ]);

    // Calculate stats for each customer
    const customersWithStats = customers.map((customer) => {
      const activeProperties = customer.properties.filter((p) => p.status === 'ACTIVE');
      const totalRent = activeProperties.reduce((sum, p) => sum + Number(p.monthlyRent), 0);
      const daysSinceOnboarding = Math.floor(
        (Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        lastLoginAt: customer.lastLoginAt,
        invitedBy: customer.invitedBy,
        assignedEmployee: customer.assignedEmployee?.employee || null,
        totalProperties: customer.properties.length,
        activeProperties: activeProperties.length,
        totalMonthlyRent: totalRent,
        daysSinceOnboarding,
      };
    });

    return {
      customers: customersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getAllEmployees(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: UserRole.EMPLOYEE },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          assignedCustomers: {
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
      }),
      prisma.user.count({ where: { role: UserRole.EMPLOYEE } }),
    ]);

    const employeesWithStats = employees.map((emp) => ({
      ...emp,
      totalCustomers: emp.assignedCustomers.length,
      customers: emp.assignedCustomers.map((a) => a.customer),
    }));

    return {
      employees: employeesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getCustomerDetails(customerId: string) {
    const customer = await prisma.user.findUnique({
      where: { id: customerId, role: UserRole.CUSTOMER },
      include: {
        properties: {
          include: {
            renovations: {
              include: {
                steps: true,
              },
            },
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    if (!customer) {
      return null;
    }

    const totalPurchaseCost = customer.properties.reduce(
      (sum, p) => sum + Number(p.purchaseCost),
      0
    );
    const activeProperties = customer.properties.filter((p) => p.status === 'ACTIVE');
    const totalMonthlyRent = activeProperties.reduce(
      (sum, p) => sum + Number(p.monthlyRent),
      0
    );

    return {
      ...customer,
      stats: {
        totalProperties: customer.properties.length,
        activeProperties: activeProperties.length,
        totalPurchaseCost,
        totalMonthlyRent,
        estimatedAnnualIncome: totalMonthlyRent * 12,
      },
    };
  },

  async assignCustomerToEmployee(customerId: string, employeeId: string) {
    // Verify both users exist and have correct roles
    const [customer, employee] = await Promise.all([
      prisma.user.findUnique({ where: { id: customerId } }),
      prisma.user.findUnique({ where: { id: employeeId } }),
    ]);

    if (!customer || customer.role !== UserRole.CUSTOMER) {
      throw new Error('Customer not found');
    }

    if (!employee || employee.role !== UserRole.EMPLOYEE) {
      throw new Error('Employee not found');
    }

    // Upsert assignment
    return prisma.customerAssignment.upsert({
      where: { customerId },
      update: { employeeId },
      create: { customerId, employeeId },
    });
  },

  async toggleUserStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new Error('Cannot deactivate admin');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
  },
};
