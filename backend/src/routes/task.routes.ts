import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Check board access via group
async function checkAccessViaGroup(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      board: {
        include: {
          workspace: { include: { members: { where: { userId, isActive: true } } } },
          boardMembers: { where: { userId } },
        },
      },
    },
  });

  if (!group) return null;

  const workspaceMember = group.board.workspace.members[0];
  if (!workspaceMember) return null;

  if (workspaceMember.role === UserRole.OWNER_ADMIN || workspaceMember.role === UserRole.EMPLOYEE) {
    return { canEdit: true, board: group.board };
  }

  const boardMember = group.board.boardMembers[0];
  if (group.board.isPublic || boardMember) {
    return { canEdit: boardMember?.canEdit || false, board: group.board };
  }

  return null;
}

// Check board access via task
async function checkAccessViaTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      group: {
        include: {
          board: {
            include: {
              workspace: { include: { members: { where: { userId, isActive: true } } } },
              boardMembers: { where: { userId } },
            },
          },
        },
      },
    },
  });

  if (!task) return null;

  const workspaceMember = task.group.board.workspace.members[0];
  if (!workspaceMember) return null;

  if (workspaceMember.role === UserRole.OWNER_ADMIN || workspaceMember.role === UserRole.EMPLOYEE) {
    return { canEdit: true, task, board: task.group.board };
  }

  const boardMember = task.group.board.boardMembers[0];
  if (task.group.board.isPublic || boardMember) {
    return { canEdit: boardMember?.canEdit || false, task, board: task.group.board };
  }

  return null;
}

// Get single task with full details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const access = await checkAccessViaTask(req.params.id, req.user!.id);
    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        fieldValues: { include: { column: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
        },
        comments: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        subTasks: { orderBy: { position: 'asc' } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        group: {
          include: {
            board: { select: { id: true, name: true, workspaceId: true } },
          },
        },
      },
    });

    res.json({ task, canEdit: access.canEdit });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post(
  '/',
  validate([
    body('groupId').isUUID(),
    body('name').trim().notEmpty(),
    body('fieldValues').optional().isObject(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { groupId, name, fieldValues } = req.body;

      const access = await checkAccessViaGroup(groupId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      // Get max position
      const maxPos = await prisma.task.aggregate({
        where: { groupId },
        _max: { position: true },
      });

      const task = await prisma.task.create({
        data: {
          groupId,
          createdById: req.user!.id,
          name,
          position: (maxPos._max.position || 0) + 1,
        },
        include: {
          fieldValues: true,
          assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          taskId: task.id,
          userId: req.user!.id,
          action: 'created',
          details: { name },
        },
      });

      res.status(201).json({ task });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update task
router.patch(
  '/:id',
  validate([
    body('name').optional().trim().notEmpty(),
    body('groupId').optional().isUUID(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const access = await checkAccessViaTask(req.params.id, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const { name, groupId } = req.body;
      const data: any = {};

      if (name) data.name = name;
      if (groupId) {
        // If moving to different group, update position
        const maxPos = await prisma.task.aggregate({
          where: { groupId },
          _max: { position: true },
        });
        data.groupId = groupId;
        data.position = (maxPos._max.position || 0) + 1;
      }

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data,
        include: {
          fieldValues: true,
          assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          taskId: task.id,
          userId: req.user!.id,
          action: groupId ? 'moved' : 'updated',
          details: req.body,
        },
      });

      res.json({ task });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update task field value
router.patch(
  '/:id/field/:columnId',
  validate([
    body('value').exists(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, columnId } = req.params;
      const { value } = req.body;

      const access = await checkAccessViaTask(id, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const fieldValue = await prisma.taskFieldValue.upsert({
        where: { taskId_columnId: { taskId: id, columnId } },
        create: { taskId: id, columnId, value },
        update: { value },
        include: { column: true },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          taskId: id,
          userId: req.user!.id,
          action: 'field_updated',
          details: { columnId, value },
        },
      });

      res.json({ fieldValue });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Reorder tasks
router.post(
  '/reorder',
  validate([
    body('groupId').isUUID(),
    body('taskIds').isArray(),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { groupId, taskIds } = req.body;

      const access = await checkAccessViaGroup(groupId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      await Promise.all(
        taskIds.map((id: string, idx: number) =>
          prisma.task.update({
            where: { id },
            data: { position: idx, groupId },
          })
        )
      );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete task (soft delete)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const access = await checkAccessViaTask(req.params.id, req.user!.id);
    if (!access?.canEdit) {
      return res.status(403).json({ error: 'Edit access required' });
    }

    await prisma.task.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// === Assignments ===

router.post(
  '/:id/assign',
  validate([body('userId').isUUID()]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const access = await checkAccessViaTask(id, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const assignment = await prisma.taskAssignment.create({
        data: { taskId: id, userId },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          message: `You were assigned to "${access.task?.name}"`,
          link: `/boards/${access.board?.id}?task=${id}`,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          taskId: id,
          userId: req.user!.id,
          action: 'assigned',
          details: { assignedUserId: userId },
        },
      });

      res.json({ assignment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:id/assign/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;

    const access = await checkAccessViaTask(id, req.user!.id);
    if (!access?.canEdit) {
      return res.status(403).json({ error: 'Edit access required' });
    }

    await prisma.taskAssignment.delete({
      where: { taskId_userId: { taskId: id, userId } },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// === Comments ===

router.post(
  '/:id/comments',
  validate([body('content').trim().notEmpty()]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      const access = await checkAccessViaTask(id, req.user!.id);
      if (!access) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const comment = await prisma.comment.create({
        data: { taskId: id, userId: req.user!.id, content },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      });

      // Notify task assignees
      const assignments = await prisma.taskAssignment.findMany({
        where: { taskId: id, userId: { not: req.user!.id } },
      });

      for (const a of assignments) {
        await prisma.notification.create({
          data: {
            userId: a.userId,
            type: 'TASK_COMMENT',
            title: 'New Comment',
            message: `${req.user!.name} commented on "${access.task?.name}"`,
            link: `/boards/${access.board?.id}?task=${id}`,
          },
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          taskId: id,
          userId: req.user!.id,
          action: 'commented',
          details: { commentId: comment.id },
        },
      });

      res.status(201).json({ comment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:taskId/comments/:commentId', async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, commentId } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Can only delete your own comments' });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// === Sub-tasks ===

router.post(
  '/:id/subtasks',
  validate([body('name').trim().notEmpty()]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const access = await checkAccessViaTask(id, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const maxPos = await prisma.subTask.aggregate({
        where: { taskId: id },
        _max: { position: true },
      });

      const subTask = await prisma.subTask.create({
        data: {
          taskId: id,
          name,
          position: (maxPos._max.position || 0) + 1,
        },
      });

      res.status(201).json({ subTask });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.patch(
  '/:taskId/subtasks/:subTaskId',
  async (req: AuthRequest, res: Response) => {
    try {
      const { taskId, subTaskId } = req.params;
      const { name, isCompleted } = req.body;

      const access = await checkAccessViaTask(taskId, req.user!.id);
      if (!access?.canEdit) {
        return res.status(403).json({ error: 'Edit access required' });
      }

      const subTask = await prisma.subTask.update({
        where: { id: subTaskId },
        data: {
          ...(name !== undefined && { name }),
          ...(isCompleted !== undefined && { isCompleted }),
        },
      });

      res.json({ subTask });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete('/:taskId/subtasks/:subTaskId', async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, subTaskId } = req.params;

    const access = await checkAccessViaTask(taskId, req.user!.id);
    if (!access?.canEdit) {
      return res.status(403).json({ error: 'Edit access required' });
    }

    await prisma.subTask.delete({ where: { id: subTaskId } });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
