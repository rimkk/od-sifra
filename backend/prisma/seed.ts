import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@odsifra.com' },
    update: {},
    create: {
      email: 'admin@odsifra.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create employee user
  const employeePassword = await bcrypt.hash('employee123', 12);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@odsifra.com' },
    update: {},
    create: {
      email: 'employee@odsifra.com',
      passwordHash: employeePassword,
      name: 'John Employee',
      role: UserRole.EMPLOYEE,
      invitedById: admin.id,
    },
  });
  console.log('✅ Employee user created:', employee.email);

  // Create a customer account (shared account for multiple users)
  const customerAccount = await prisma.customerAccount.upsert({
    where: { id: '00000000-0000-0000-0000-000000000100' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000100',
      name: 'Smith Family',
      description: 'Property investment account for the Smith family',
    },
  });
  console.log('✅ Customer account created:', customerAccount.name);

  // Create customer user (linked to customer account)
  const customerPassword = await bcrypt.hash('customer123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@odsifra.com' },
    update: { customerAccountId: customerAccount.id },
    create: {
      email: 'customer@odsifra.com',
      passwordHash: customerPassword,
      name: 'Jane Smith',
      role: UserRole.CUSTOMER,
      invitedById: employee.id,
      customerAccountId: customerAccount.id,
    },
  });
  console.log('✅ Customer user created:', customer.email);

  // Create second customer user for same account (e.g., spouse)
  const customer2Password = await bcrypt.hash('customer123', 12);
  const customer2 = await prisma.user.upsert({
    where: { email: 'john@odsifra.com' },
    update: { customerAccountId: customerAccount.id },
    create: {
      email: 'john@odsifra.com',
      passwordHash: customer2Password,
      name: 'John Smith',
      role: UserRole.CUSTOMER,
      invitedById: employee.id,
      customerAccountId: customerAccount.id,
    },
  });
  console.log('✅ Second customer user created:', customer2.email);

  // Assign customer account to employee
  await prisma.customerAssignment.upsert({
    where: { customerAccountId: customerAccount.id },
    update: {},
    create: {
      customerAccountId: customerAccount.id,
      employeeId: employee.id,
    },
  });
  console.log('✅ Customer account assigned to employee');

  // Create sample properties (linked to customer account)
  const property1 = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { customerAccountId: customerAccount.id },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      customerAccountId: customerAccount.id,
      address: '123 Main Street',
      city: 'Zagreb',
      postalCode: '10000',
      country: 'Croatia',
      description: 'Beautiful apartment in the city center',
      purchaseCost: 150000,
      monthlyRent: 800,
      tenantName: 'Mark Tenant',
      tenantEmail: 'mark@example.com',
      tenantPhone: '+385 99 123 4567',
      rentalStart: new Date('2024-01-01'),
      rentalEnd: new Date('2025-01-01'),
      status: 'ACTIVE',
    },
  });
  console.log('✅ Property 1 created:', property1.address);

  const property2 = await prisma.property.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { customerAccountId: customerAccount.id },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      customerAccountId: customerAccount.id,
      address: '456 Oak Avenue',
      city: 'Split',
      postalCode: '21000',
      country: 'Croatia',
      description: 'Seaside apartment with ocean view',
      purchaseCost: 220000,
      monthlyRent: 1200,
      status: 'RENOVATION',
    },
  });
  console.log('✅ Property 2 created:', property2.address);

  // Create renovation for property 2
  const renovation = await prisma.renovation.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      propertyId: property2.id,
      title: 'Kitchen Renovation',
      description: 'Complete kitchen remodel with new appliances',
      budget: 15000,
      status: 'IN_PROGRESS',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-08-01'),
    },
  });
  console.log('✅ Renovation created:', renovation.title);

  // Delete existing steps and recreate
  await prisma.renovationStep.deleteMany({
    where: { renovationId: renovation.id },
  });

  // Create renovation steps
  const steps = await Promise.all([
    prisma.renovationStep.create({
      data: {
        renovationId: renovation.id,
        title: 'Remove old cabinets',
        status: 'COMPLETED',
        orderIndex: 0,
        completedAt: new Date('2024-06-05'),
      },
    }),
    prisma.renovationStep.create({
      data: {
        renovationId: renovation.id,
        title: 'Install new plumbing',
        status: 'COMPLETED',
        orderIndex: 1,
        completedAt: new Date('2024-06-15'),
      },
    }),
    prisma.renovationStep.create({
      data: {
        renovationId: renovation.id,
        title: 'Install new cabinets',
        status: 'IN_PROGRESS',
        orderIndex: 2,
        dueDate: new Date('2024-07-01'),
      },
    }),
    prisma.renovationStep.create({
      data: {
        renovationId: renovation.id,
        title: 'Install countertops',
        status: 'PLANNED',
        orderIndex: 3,
        dueDate: new Date('2024-07-15'),
      },
    }),
    prisma.renovationStep.create({
      data: {
        renovationId: renovation.id,
        title: 'Install appliances',
        status: 'PLANNED',
        orderIndex: 4,
        dueDate: new Date('2024-07-25'),
      },
    }),
  ]);
  console.log('✅ Renovation steps created:', steps.length);

  // Create sample notifications
  await prisma.notification.deleteMany({
    where: { userId: { in: [customer.id, customer2.id] } },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: customer.id,
        title: 'Welcome to Od Sifra!',
        body: 'Your account has been set up. Explore your properties dashboard.',
        type: 'SYSTEM',
      },
      {
        userId: customer.id,
        title: 'Renovation Update',
        body: 'New cabinets installation has started at 456 Oak Avenue',
        type: 'RENOVATION_UPDATE',
        metadata: { propertyId: property2.id, renovationId: renovation.id },
      },
      {
        userId: customer2.id,
        title: 'Welcome to Od Sifra!',
        body: 'You have been added to the Smith Family account.',
        type: 'SYSTEM',
      },
    ],
  });
  console.log('✅ Sample notifications created');

  // Create sample messages
  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: { in: [employee.id, customer.id] } },
        { receiverId: { in: [employee.id, customer.id] } },
      ],
    },
  });

  await prisma.message.createMany({
    data: [
      {
        senderId: employee.id,
        receiverId: customer.id,
        content: 'Hello! Welcome to Od Sifra. Let me know if you have any questions about your properties.',
      },
      {
        senderId: customer.id,
        receiverId: employee.id,
        content: 'Thank you! When will the kitchen renovation be completed?',
      },
      {
        senderId: employee.id,
        receiverId: customer.id,
        content: 'The renovation is on track to be completed by August 1st. I\'ll keep you updated on the progress.',
      },
    ],
  });
  console.log('✅ Sample messages created');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Test credentials:');
  console.log('   Admin: admin@odsifra.com / admin123');
  console.log('   Employee: employee@odsifra.com / employee123');
  console.log('   Customer (Jane): customer@odsifra.com / customer123');
  console.log('   Customer (John): john@odsifra.com / customer123');
  console.log('\n   Note: Both Jane and John share the same "Smith Family" account');
  console.log('   and can see the same properties.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
