import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole, BoardType, FieldType } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Default columns for different board types
const DEFAULT_COLUMNS = {
  GENERAL: [
    { name: 'Status', type: FieldType.STATUS, settings: { options: [
      { id: '1', label: 'To Do', color: '#6B7280' },
      { id: '2', label: 'In Progress', color: '#F59E0B' },
      { id: '3', label: 'Done', color: '#10B981' },
    ]}},
    { name: 'Person', type: FieldType.PERSON },
    { name: 'Due Date', type: FieldType.DATE },
  ],
  PROPERTY: [
    { name: 'Status', type: FieldType.STATUS, settings: { options: [
      { id: '1', label: 'Searching', color: '#6B7280' },
      { id: '2', label: 'Viewing', color: '#3B82F6' },
      { id: '3', label: 'Negotiating', color: '#F59E0B' },
      { id: '4', label: 'Purchased', color: '#10B981' },
    ]}},
    { name: 'Purchase Price', type: FieldType.MONEY },
    { name: 'Monthly Rent', type: FieldType.MONEY },
    { name: 'Tenant', type: FieldType.TEXT },
    { name: 'Occupancy', type: FieldType.STATUS, settings: { options: [
      { id: '1', label: 'Vacant', color: '#EF4444' },
      { id: '2', label: 'Occupied', color: '#10B981' },
      { id: '3', label: 'Renovation', color: '#F59E0B' },
    ]}},
    { name: 'Rented Since', type: FieldType.DATE },
    { name: 'Total Income', type: FieldType.MONEY },
    { name: 'Notes', type: FieldType.TEXT },
  ],
  PROJECT: [
    { name: 'Status', type: FieldType.STATUS, settings: { options: [
      { id: '1', label: 'Not Started', color: '#6B7280' },
      { id: '2', label: 'In Progress', color: '#3B82F6' },
      { id: '3', label: 'Review', color: '#F59E0B' },
      { id: '4', label: 'Completed', color: '#10B981' },
    ]}},
    { name: 'Assignee', type: FieldType.PERSON },
    { name: 'Priority', type: FieldType.STATUS, settings: { options: [
      { id: '1', label: 'Low', color: '#6B7280' },
      { id: '2', label: 'Medium', color: '#F59E0B' },
      { id: '3', label: 'High', color: '#EF4444' },
    ]}},
    { name: 'Due Date', type: FieldType.DATE },
    { name: 'Budget', type: FieldType.MONEY },
  ],
  CRM: [
    { name: 'Status', type: FieldType.STATUS, settings: { options: [
      { id: '1', label: 'Lead', color: '#6B7280' },
      { id: '2', label: 'Qualified', color: '#3B82F6' },
      { id: '3', label: 'Proposal', color: '#F59E0B' },
      { id: '4', label: 'Won', color: '#10B981' },
      { id: '5', label: 'Lost', color: '#EF4444' },
    ]}},
    { name: 'Contact', type: FieldType.PERSON },
    { name: 'Email', type: FieldType.EMAIL },
    { name: 'Phone', type: FieldType.PHONE },
    { name: 'Value', type: FieldType.MONEY },
    { name: 'Last Contact', type: FieldType.DATE },
  ],
};

// Check board access
async function checkBoardAccess(boardId: string, userId: string, requireEdit = false) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      workspace: {
        include: {
          members: { where: { userId, isActive: true } },
        },
      },
      boardMembers: { where: { userId } },
    },
  });

  if (!board) return null;

  const workspaceMember = board.workspace.members[0];
  if (!workspaceMember) return null;

  // Admin/Employee can access all boards in workspace
  if (workspaceMember.role === UserRole.OWNER_ADMIN || workspaceMember.role === UserRole.EMPLOYEE) {
    return { board, canEdit: true };
  }

  // Customer can only access boards they're members of or public boards
  const boardMember = board.boardMembers[0];
  if (board.isPublic || boardMember) {
    return { board, canEdit: boardMember?.canEdit || false };
  }

  return null;
}

// Get boards for workspace
router.get('/workspace/:workspaceId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Check workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let whereClause: any = { workspaceId, isActive: true };

    // Customers only see boards they're members of or public boards
    if (membership.role === UserRole.CUSTOMER) {
      whereClause = {
        ...whereClause,
        OR: [
          { isPublic: true },
          { boardMembers: { some: { userId: req.user!.id } } },
        ],
      };
    }

    const boards = await prisma.board.findMany({
      where: whereClause,
      include: {
        _count: { select: { groups: true } },
        groups: {
          include: { _count: { select: { tasks: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate task counts
    const boardsWithCounts = boards.map((b) => ({
      ...b,
      taskCount: b.groups.reduce((sum, g) => sum + g._count.tasks, 0),
      groups: undefined,
    }));

    res.json({ boards: boardsWithCounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single board with full data
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const access = await checkBoardAccess(req.params.id, req.user!.id);
    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const board = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: {
        columns: { orderBy: { position: 'asc' } },
        groups: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              where: { isActive: true },
              orderBy: { position: 'asc' },
              include: {
                fieldValues: true,
                assignments: {
                  include: { user: { select: { id: true, name: true, avatarUrl: true } } },
                },
                _count: { select: { comments: true, subTasks: true } },
              },
            },
          },
        },
        boardMembers: {
          include: { }, // Just IDs for permission check
        },
        workspace: {
          include: {
            members: {
              where: { isActive: true },
              include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
            },
          },
        },
      },
    });

    res.json({ board, canEdit: access.canEdit });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create board
router.post(
  '/',
  validate([
    body('workspaceId').isUUID(),
    body('name').trim().notEmpty(),
    body('type').optional().isIn(['GENERAL', 'PROPERTY', 'PROJECT', 'CRM']),
    body('description').optional().trim(),
    body('color').optional().trim(),
    body('isPublic').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, name, type = 'GENERAL', description, color, isPublic } = req.body;

      // Check workspace membership (only admin/employee can create)
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
      });

      if (!membership || membership.role === UserRole.CUSTOMER) {
        return res.status(403).json({ error: 'Not authorized to create boards' });
      }

      // Create board with default columns and one group
      const board = await prisma.board.create({
        data: {
          workspaceId,
          createdById: req.user!.id,
          name,
          type: type as BoardType,
          description,
          color,
          isPublic: isPublic || false,
          columns: {
            create: (DEFAULT_COLUMNS[type as keyof typeof DEFAULT_COLUMNS] || DEFAULT_COLUMNS.GENERAL).map((col, idx) => ({
              name: col.name,
              type: col.type,
              settings: col.settings || null,
              position: idx,
            })),
          },
          groups: {
            create: { name: 'New Group', position: 0 },
          },
        },
        include: {
          columns: { orderBy: { position: 'asc' } },
          groups: true,
        },
      });

      res.status(201).json({ board });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update board
router.patch(
  '/:id',
  validate([
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('color').optional().trim(),
    body('isPublic').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const access = await checkBoardAccess(req.params.id, req.user!.id, true);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const board = await prisma.board.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({ board });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete board (soft delete)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const access = await checkBoardAccess(req.params.id, req.user!.id, true);
    if (!access?.canEdit) {
      return res.status(403).json({ error: 'Edit access required' });
    }

    await prisma.board.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add board member
router.post(
  '/:id/members',
  validate([
    body('userId').isUUID(),
    body('canEdit').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const access = await checkBoardAccess(req.params.id, req.user!.id, true);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const { userId, canEdit = true } = req.body;

      const member = await prisma.boardMember.upsert({
        where: { boardId_userId: { boardId: req.params.id, userId } },
        create: { boardId: req.params.id, userId, canEdit },
        update: { canEdit },
      });

      res.json({ member });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Remove board member
router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const access = await checkBoardAccess(req.params.id, req.user!.id, true);
    if (!access?.canEdit) {
      return res.status(403).json({ error: 'Edit access required' });
    }

    await prisma.boardMember.delete({
      where: { boardId_userId: { boardId: req.params.id, userId: req.params.userId } },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
