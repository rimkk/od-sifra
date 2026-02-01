import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Check board access helper
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

// Create group
router.post(
  '/',
  validate([
    body('boardId').isUUID(),
    body('name').trim().notEmpty(),
    body('color').optional().trim(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { boardId, name, color } = req.body;

      const access = await checkBoardAccess(boardId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      // Get max position
      const maxPos = await prisma.group.aggregate({
        where: { boardId },
        _max: { position: true },
      });

      const group = await prisma.group.create({
        data: {
          boardId,
          name,
          color,
          position: (maxPos._max.position || 0) + 1,
        },
      });

      res.status(201).json({ group });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update group
router.patch(
  '/:id',
  validate([
    body('name').optional().trim().notEmpty(),
    body('color').optional().trim(),
    body('collapsed').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const group = await prisma.group.findUnique({
        where: { id: req.params.id },
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const access = await checkBoardAccess(group.boardId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const updated = await prisma.group.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({ group: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Reorder groups
router.post(
  '/reorder',
  validate([
    body('boardId').isUUID(),
    body('groupIds').isArray(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { boardId, groupIds } = req.body;

      const access = await checkBoardAccess(boardId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      // Update positions
      await Promise.all(
        groupIds.map((id: string, idx: number) =>
          prisma.group.update({
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

// Delete group (soft delete)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const access = await checkBoardAccess(group.boardId, req.user!.id);
    if (!access?.canEdit) {
      return res.status(403).json({ error: 'Edit access required' });
    }

    await prisma.group.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
