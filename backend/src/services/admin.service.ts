import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

export const adminService = {
  async getDashboardOverview() {
    const [
      totalCustomerAccounts,
      totalCustomerUsers,
      totalEmployees,
      totalProperties,
      activeProperties,
      recentAccounts,
    ] = await Promise.all([
      prisma.customerAccount.count(),
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      prisma.user.count({ where: { role: UserRole.EMPLOYEE } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: 'ACTIVE' } }),
      prisma.customerAccount.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          createdAt: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
            take: 2,
          },
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
      totalCustomers: totalCustomerAccounts,
      totalCustomerUsers,
      totalEmployees,
      totalProperties,
      activeProperties,
      vacantProperties: totalProperties - activeProperties,
      totalMonthlyRent,
      estimatedAnnualRevenue: totalMonthlyRent * 12,
      recentCustomers: recentAccounts.map(account => ({
        id: account.id,
        name: account.name,
        email: account.users[0]?.email || 'No users',
        createdAt: account.createdAt,
        userCount: account.users.length,
      })),
    };
  },

  async getAllCustomers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      prisma.customerAccount.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
          properties: {
            select: {
              id: true,
              monthlyRent: true,
              status: true,
            },
          },
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
      }),
      prisma.customerAccount.count(),
    ]);

    // Calculate stats for each customer account
    const customersWithStats = accounts.map((account) => {
      const activeProperties = account.properties.filter((p) => p.status === 'ACTIVE');
      const totalRent = activeProperties.reduce((sum, p) => sum + Number(p.monthlyRent), 0);
      const daysSinceOnboarding = Math.floor(
        (Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: account.id,
        name: account.name,
        email: account.users[0]?.email || 'No users',
        phone: account.users[0]?.phone,
        isActive: account.isActive,
        createdAt: account.createdAt,
        lastLoginAt: account.users[0]?.lastLoginAt,
        users: account.users,
        assignedEmployee: account.assignments[0]?.employee || null,
        totalProperties: account.properties.length,
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
          assignedAccounts: {
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
      }),
      prisma.user.count({ where: { role: UserRole.EMPLOYEE } }),
    ]);

    const employeesWithStats = employees.map((emp) => ({
      ...emp,
      totalCustomers: emp.assignedAccounts.length,
      customers: emp.assignedAccounts.map((a) => a.customerAccount),
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
    // Try to find as CustomerAccount first
    const account = await prisma.customerAccount.findUnique({
      where: { id: customerId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        properties: {
          include: {
            renovations: {
              include: {
                steps: true,
              },
            },
          },
        },
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
    });

    if (!account) {
      return null;
    }

    const totalPurchaseCost = account.properties.reduce(
      (sum, p) => sum + Number(p.purchaseCost),
      0
    );
    const activeProperties = account.properties.filter((p) => p.status === 'ACTIVE');
    const totalMonthlyRent = activeProperties.reduce(
      (sum, p) => sum + Number(p.monthlyRent),
      0
    );

    return {
      id: account.id,
      name: account.name,
      description: account.description,
      isActive: account.isActive,
      createdAt: account.createdAt,
      users: account.users,
      properties: account.properties,
      assignedEmployee: account.assignments[0]?.employee || null,
      stats: {
        totalProperties: account.properties.length,
        activeProperties: activeProperties.length,
        totalPurchaseCost,
        totalMonthlyRent,
        estimatedAnnualIncome: totalMonthlyRent * 12,
      },
    };
  },

  async assignCustomerToEmployee(customerAccountId: string, employeeId: string) {
    // Verify account and employee exist
    const [account, employee] = await Promise.all([
      prisma.customerAccount.findUnique({ where: { id: customerAccountId } }),
      prisma.user.findUnique({ where: { id: employeeId } }),
    ]);

    if (!account) {
      throw new Error('Customer account not found');
    }

    if (!employee || employee.role !== UserRole.EMPLOYEE) {
      throw new Error('Employee not found');
    }

    // Upsert assignment
    return prisma.customerAssignment.upsert({
      where: { customerAccountId },
      update: { employeeId },
      create: { customerAccountId, employeeId },
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

  async toggleAccountStatus(accountId: string) {
    const account = await prisma.customerAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return prisma.customerAccount.update({
      where: { id: accountId },
      data: { isActive: !account.isActive },
    });
  },
};
