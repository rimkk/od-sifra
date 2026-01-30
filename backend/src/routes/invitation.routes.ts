import { Router, Response, Request } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { invitationService } from '../services/invitation.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Validate invitation token (public)
router.get(
  '/validate/:token',
  validate([param('token').isUUID().withMessage('Invalid invitation token')]),
  async (req: Request, res: Response) => {
    try {
      const invitation = await invitationService.getInvitationByToken(req.params.token);
      res.json({
        invitation: {
          email: invitation.email,
          role: invitation.role,
          inviterName: invitation.inviter.name,
          expiresAt: invitation.expiresAt,
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Create invitation (admin or employee)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.EMPLOYEE),
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('role')
      .isIn(['EMPLOYEE', 'CUSTOMER'])
      .withMessage('Role must be EMPLOYEE or CUSTOMER'),
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const invitation = await invitationService.createInvitation(
        req.user!.id,
        req.body.email,
        req.body.role as UserRole
      );

      // Generate invitation link
      const appScheme = process.env.MOBILE_APP_SCHEME || 'odsifra';
      const inviteLink = `${appScheme}://register?token=${invitation.token}`;
      const webLink = `${process.env.APP_URL}/register?token=${invitation.token}`;

      res.status(201).json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          token: invitation.token,
        },
        links: {
          app: inviteLink,
          web: webLink,
        },
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

// Get user's sent invitations
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const invitations = await invitationService.getInvitationsByUser(req.user!.id);
    res.json({ invitations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete invitation
router.delete(
  '/:id',
  authenticate,
  validate([param('id').isUUID().withMessage('Invalid invitation ID')]),
  async (req: AuthRequest, res: Response) => {
    try {
      await invitationService.deleteInvitation(req.user!.id, req.params.id);
      res.json({ message: 'Invitation deleted' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
);

export default router;
