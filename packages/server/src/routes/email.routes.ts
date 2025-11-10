import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { emailSyncQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import outlookService from '../services/outlook.service';
import gmailService from '../services/gmail.service';
import logger from '../utils/logger';

const router = Router();

// Get user's emails
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', unreadOnly = 'false' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { userId: req.userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const emails = await prisma.email.findMany({
      where,
      include: {
        summary: true,
      },
      orderBy: { receivedDateTime: 'desc' },
      take: parseInt(limit as string),
      skip,
    });

    const total = await prisma.email.count({ where });

    res.json({
      success: true,
      data: {
        emails,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching emails:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch emails' });
  }
});

// Get single email with details
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        summary: true,
        draftReplies: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    res.json({ success: true, data: email });
  } catch (error) {
    logger.error('Error fetching email:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email' });
  }
});

// Sync emails from provider
router.post('/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Add sync job to queue
    await emailSyncQueue.add('sync-emails', {
      userId: user.id,
      provider: user.provider,
      syncType: 'full',
    });

    res.json({
      success: true,
      message: 'Email sync started',
    });
  } catch (error) {
    logger.error('Error starting email sync:', error);
    res.status(500).json({ success: false, error: 'Failed to start sync' });
  }
});

// Send email
router.post('/send', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, body',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || !user.accessToken) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const toAddresses = Array.isArray(to) ? to : [to];

    if (user.provider === 'outlook') {
      await outlookService.sendEmail(user.accessToken, toAddresses, subject, body);
    } else if (user.provider === 'gmail') {
      await gmailService.sendEmail(user.accessToken, toAddresses, subject, body);
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported email provider' });
    }

    res.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    logger.error('Error sending email:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Mark email as read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const email = await prisma.email.updateMany({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      data: {
        isRead: true,
      },
    });

    if (email.count === 0) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    res.json({ success: true, message: 'Email marked as read' });
  } catch (error) {
    logger.error('Error marking email as read:', error);
    res.status(500).json({ success: false, error: 'Failed to update email' });
  }
});

export default router;
