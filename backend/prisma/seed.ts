import { PrismaClient, UserRole, BoardType, FieldType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.threadParticipant.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.subTask.deleteMany();
  await prisma.taskFieldValue.deleteMany();
  await prisma.task.deleteMany();
  await prisma.group.deleteMany();
  await prisma.column.deleteMany();
  await prisma.boardMember.deleteMany();
  await prisma.board.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  // Create Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@odsifra.com',
      passwordHash,
      name: 'Admin User',
      role: UserRole.OWNER_ADMIN,
      emailVerified: true,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'D Sifra Properties',
      slug: 'd-sifra',
      description: 'Property management and project tracking',
      defaultCurrency: 'USD',
      members: {
        create: { userId: admin.id, role: UserRole.OWNER_ADMIN },
      },
    },
  });
  console.log('✅ Created workspace:', workspace.name);

  // Create Employee
  const employee = await prisma.user.create({
    data: {
      email: 'employee@odsifra.com',
      passwordHash,
      name: 'Sarah Employee',
      role: UserRole.EMPLOYEE,
      emailVerified: true,
      workspaces: {
        create: { workspaceId: workspace.id, role: UserRole.EMPLOYEE },
      },
    },
  });
  console.log('✅ Created employee:', employee.email);

  // Create Customer
  const customer = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      passwordHash,
      name: 'John Customer',
      role: UserRole.CUSTOMER,
      emailVerified: true,
      workspaces: {
        create: { workspaceId: workspace.id, role: UserRole.CUSTOMER },
      },
    },
  });
  console.log('✅ Created customer:', customer.email);

  // Create Property Board
  const propertyBoard = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      createdById: admin.id,
      name: 'Investment Properties',
      description: 'Track all property investments',
      type: BoardType.PROPERTY,
      isPublic: true,
      columns: {
        create: [
          { name: 'Status', type: FieldType.STATUS, position: 0, settings: { options: [
            { id: '1', label: 'Searching', color: '#6B7280' },
            { id: '2', label: 'Viewing', color: '#3B82F6' },
            { id: '3', label: 'Negotiating', color: '#F59E0B' },
            { id: '4', label: 'Purchased', color: '#10B981' },
          ]}},
          { name: 'Purchase Price', type: FieldType.MONEY, position: 1 },
          { name: 'Monthly Rent', type: FieldType.MONEY, position: 2 },
          { name: 'Tenant', type: FieldType.TEXT, position: 3 },
          { name: 'Occupancy', type: FieldType.STATUS, position: 4, settings: { options: [
            { id: '1', label: 'Vacant', color: '#EF4444' },
            { id: '2', label: 'Occupied', color: '#10B981' },
            { id: '3', label: 'Renovation', color: '#F59E0B' },
          ]}},
          { name: 'Rented Since', type: FieldType.DATE, position: 5 },
          { name: 'Notes', type: FieldType.TEXT, position: 6 },
        ],
      },
      groups: {
        create: [
          { name: 'Active Properties', position: 0, color: '#10B981' },
          { name: 'Under Review', position: 1, color: '#3B82F6' },
        ],
      },
    },
    include: { columns: true, groups: true },
  });
  console.log('✅ Created property board:', propertyBoard.name);

  // Add tasks to property board
  const activeGroup = propertyBoard.groups.find(g => g.name === 'Active Properties')!;
  const reviewGroup = propertyBoard.groups.find(g => g.name === 'Under Review')!;
  const statusCol = propertyBoard.columns.find(c => c.name === 'Status')!;
  const priceCol = propertyBoard.columns.find(c => c.name === 'Purchase Price')!;
  const rentCol = propertyBoard.columns.find(c => c.name === 'Monthly Rent')!;
  const tenantCol = propertyBoard.columns.find(c => c.name === 'Tenant')!;
  const occupancyCol = propertyBoard.columns.find(c => c.name === 'Occupancy')!;

  const property1 = await prisma.task.create({
    data: {
      groupId: activeGroup.id,
      createdById: admin.id,
      name: '123 Main St, Miami FL',
      position: 0,
      fieldValues: {
        create: [
          { columnId: statusCol.id, value: '4' },
          { columnId: priceCol.id, value: 450000 },
          { columnId: rentCol.id, value: 3500 },
          { columnId: tenantCol.id, value: 'Smith Family' },
          { columnId: occupancyCol.id, value: '2' },
        ],
      },
    },
  });

  const property2 = await prisma.task.create({
    data: {
      groupId: activeGroup.id,
      createdById: admin.id,
      name: '456 Oak Ave, Tampa FL',
      position: 1,
      fieldValues: {
        create: [
          { columnId: statusCol.id, value: '4' },
          { columnId: priceCol.id, value: 320000 },
          { columnId: rentCol.id, value: 2200 },
          { columnId: tenantCol.id, value: '' },
          { columnId: occupancyCol.id, value: '1' },
        ],
      },
    },
  });

  const property3 = await prisma.task.create({
    data: {
      groupId: reviewGroup.id,
      createdById: admin.id,
      name: '789 Beach Blvd, Orlando FL',
      position: 0,
      fieldValues: {
        create: [
          { columnId: statusCol.id, value: '2' },
          { columnId: priceCol.id, value: 520000 },
          { columnId: rentCol.id, value: 4000 },
        ],
      },
    },
  });

  console.log('✅ Created property tasks');

  // Create Project Board
  const projectBoard = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      createdById: admin.id,
      name: 'Q1 Renovations',
      description: 'Renovation projects for Q1 2024',
      type: BoardType.PROJECT,
      isPublic: true,
      columns: {
        create: [
          { name: 'Status', type: FieldType.STATUS, position: 0, settings: { options: [
            { id: '1', label: 'Not Started', color: '#6B7280' },
            { id: '2', label: 'In Progress', color: '#3B82F6' },
            { id: '3', label: 'Review', color: '#F59E0B' },
            { id: '4', label: 'Completed', color: '#10B981' },
          ]}},
          { name: 'Assignee', type: FieldType.PERSON, position: 1 },
          { name: 'Priority', type: FieldType.STATUS, position: 2, settings: { options: [
            { id: '1', label: 'Low', color: '#6B7280' },
            { id: '2', label: 'Medium', color: '#F59E0B' },
            { id: '3', label: 'High', color: '#EF4444' },
          ]}},
          { name: 'Due Date', type: FieldType.DATE, position: 3 },
          { name: 'Budget', type: FieldType.MONEY, position: 4 },
        ],
      },
      groups: {
        create: [
          { name: 'Kitchen Renovations', position: 0, color: '#EF4444' },
          { name: 'Bathroom Updates', position: 1, color: '#3B82F6' },
          { name: 'General Repairs', position: 2, color: '#F59E0B' },
        ],
      },
      boardMembers: {
        create: { userId: customer.id, canEdit: false },
      },
    },
    include: { columns: true, groups: true },
  });
  console.log('✅ Created project board:', projectBoard.name);

  // Add tasks to project board
  const kitchenGroup = projectBoard.groups.find(g => g.name === 'Kitchen Renovations')!;
  const projStatusCol = projectBoard.columns.find(c => c.name === 'Status')!;
  const assigneeCol = projectBoard.columns.find(c => c.name === 'Assignee')!;
  const priorityCol = projectBoard.columns.find(c => c.name === 'Priority')!;
  const dueDateCol = projectBoard.columns.find(c => c.name === 'Due Date')!;
  const budgetCol = projectBoard.columns.find(c => c.name === 'Budget')!;

  await prisma.task.create({
    data: {
      groupId: kitchenGroup.id,
      createdById: admin.id,
      name: 'Replace countertops',
      position: 0,
      fieldValues: {
        create: [
          { columnId: projStatusCol.id, value: '2' },
          { columnId: assigneeCol.id, value: employee.id },
          { columnId: priorityCol.id, value: '3' },
          { columnId: budgetCol.id, value: 5000 },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      groupId: kitchenGroup.id,
      createdById: admin.id,
      name: 'Install new cabinets',
      position: 1,
      fieldValues: {
        create: [
          { columnId: projStatusCol.id, value: '1' },
          { columnId: priorityCol.id, value: '2' },
          { columnId: budgetCol.id, value: 8000 },
        ],
      },
    },
  });

  console.log('✅ Created project tasks');

  // Create a message thread
  const thread = await prisma.messageThread.create({
    data: {
      workspaceId: workspace.id,
      participants: {
        create: [
          { userId: admin.id },
          { userId: customer.id },
        ],
      },
      messages: {
        create: [
          { senderId: admin.id, content: 'Welcome to Od Sifra! Let me know if you have any questions about your properties.' },
          { senderId: customer.id, content: 'Thanks! When can we schedule the next property viewing?' },
          { senderId: admin.id, content: 'How about Thursday at 2pm?' },
        ],
      },
    },
  });
  console.log('✅ Created message thread');

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: customer.id,
        type: 'BOARD_SHARED',
        title: 'New Board Shared',
        message: 'You have been added to "Q1 Renovations"',
        link: `/boards/${projectBoard.id}`,
      },
      {
        userId: customer.id,
        type: 'MESSAGE_RECEIVED',
        title: 'New Message',
        message: 'Admin User: How about Thursday at 2pm?',
        link: `/messages/${thread.id}`,
      },
    ],
  });
  console.log('✅ Created notifications');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Demo accounts:');
  console.log('   Admin:    admin@odsifra.com / password123');
  console.log('   Employee: employee@odsifra.com / password123');
  console.log('   Customer: customer@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
