import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole, FieldType } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Check board access
async function checkBoardAccess(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      workspace: { include: { members: { where: { userId, isActive: true } } } },
      boardMembers: { where: { userId } },
    },
  });

  if (!board) return null;

  const workspaceMember = board.workspace.members[0];
  if (!workspaceMember) return null;

  if (workspaceMember.role === UserRole.OWNER_ADMIN || workspaceMember.role === UserRole.EMPLOYEE) {
    return { canEdit: true };
  }

  const boardMember = board.boardMembers[0];
  if (board.isPublic || boardMember) {
    return { canEdit: boardMember?.canEdit || false };
  }

  return null;
}

// Create column
router.post(
  '/',
  validate([
    body('boardId').isUUID(),
    body('name').trim().notEmpty(),
    body('type').isIn(Object.values(FieldType)),
    body('settings').optional().isObject(),
    body('width').optional().isInt({ min: 50, max: 500 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { boardId, name, type, settings, width } = req.body;

      const access = await checkBoardAccess(boardId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      // Get max position
      const maxPos = await prisma.column.aggregate({
        where: { boardId },
        _max: { position: true },
      });

      const column = await prisma.column.create({
        data: {
          boardId,
          name,
          type,
          settings,
          width,
          position: (maxPos._max.position || 0) + 1,
        },
      });

      res.status(201).json({ column });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update column
router.patch(
  '/:id',
  validate([
    body('name').optional().trim().notEmpty(),
    body('settings').optional().isObject(),
    body('width').optional().isInt({ min: 50, max: 500 }),
    body('isVisible').optional().isBoolean(),
    body('isRequired').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const column = await prisma.column.findUnique({
        where: { id: req.params.id },
      });

      if (!column) {
        return res.status(404).json({ error: 'Column not found' });
      }

      const access = await checkBoardAccess(column.boardId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const updated = await prisma.column.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({ column: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Reorder columns
router.post(
  '/reorder',
  validate([
    body('boardId').isUUID(),
    body('columnIds').isArray(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { boardId, columnIds } = req.body;

      const access = await checkBoardAccess(boardId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      await Promise.all(
        columnIds.map((id: string, idx: number) =>
          prisma.column.update({
            where: { id },
            data: { position: idx },
          })
        )
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete column
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const column = await prisma.column.findUnique({
      where: { id: req.params.id },
    });

    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const access = await checkBoardAccess(column.boardId, req.user!.id);
    if (!access?.canEdit) {
      return res.status(403).json({ error: 'Edit access required' });
    }

    // Delete column and all its values
    await prisma.column.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
