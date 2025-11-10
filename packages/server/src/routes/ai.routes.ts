import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { aiProcessingQueue } from '../utils/queue';
import prisma from '../utils/prisma';
import aiService from '../services/ai.service';
import logger from '../utils/logger';

const router = Router();

// Summarize email
router.post('/summarize/:emailId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: {
        id: req.params.emailId,
        userId: req.userId,
      },
    });

    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    // Check if summary already exists
    const existingSummary = await prisma.emailSummary.findUnique({
      where: { emailId: email.id },
    });

    if (existingSummary) {
      return res.json({ success: true, data: existingSummary });
    }

    // Add to AI processing queue
    await aiProcessingQueue.add('summarize', {
      emailId: email.id,
      userId: req.userId,
      taskType: 'summarize',
    });

    res.json({
      success: true,
      message: 'Summarization started',
    });
  } catch (error) {
    logger.error('Error starting email summarization:', error);
    res.status(500).json({ success: false, error: 'Failed to summarize email' });
  }
});

// Generate draft reply
router.post('/draft-reply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { emailId, shorthand } = req.body;

    if (!emailId || !shorthand) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: emailId, shorthand',
      });
    }

    const email = await prisma.email.findFirst({
      where: {
        id: emailId,
        userId: req.userId,
      },
    });

    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }

    const draftReply = await aiService.generateReply(
      email.id,
      email.subject,
      email.body,
      shorthand,
      req.userId!
    );

    // Save draft reply
    const saved = await prisma.draftReply.create({
      data: draftReply,
    });

    res.json({ success: true, data: saved });
  } catch (error) {
    logger.error('Error generating draft reply:', error);
    res.status(500).json({ success: false, error: 'Failed to generate draft reply' });
  }
});

// Learn tone from sent emails
router.post('/learn-tone', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || !user.accessToken) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // Add to AI processing queue
    await aiProcessingQueue.add('learn-tone', {
      userId: user.id,
      taskType: 'learn_tone',
    });

    res.json({
      success: true,
      message: 'Tone learning started',
    });
  } catch (error) {
    logger.error('Error starting tone learning:', error);
    res.status(500).json({ success: false, error: 'Failed to learn tone' });
  }
});

// Get user's tone profile
router.get('/tone-profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const toneProfile = await prisma.toneProfile.findUnique({
      where: { userId: req.userId },
    });

    if (!toneProfile) {
      return res.json({
        success: true,
        data: null,
        message: 'No tone profile found. Use /learn-tone to create one.',
      });
    }

    res.json({ success: true, data: toneProfile });
  } catch (error) {
    logger.error('Error fetching tone profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tone profile' });
  }
});

// Batch summarize emails
router.post('/batch-summarize', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { emailIds } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'emailIds must be a non-empty array',
      });
    }

    const emails = await prisma.email.findMany({
      where: {
        id: { in: emailIds },
        userId: req.userId,
      },
    });

    if (emails.length === 0) {
      return res.status(404).json({ success: false, error: 'No emails found' });
    }

    // Add jobs to queue
    for (const email of emails) {
      await aiProcessingQueue.add('summarize', {
        emailId: email.id,
        userId: req.userId,
        taskType: 'summarize',
      });
    }

    res.json({
      success: true,
      message: `Summarization started for ${emails.length} emails`,
    });
  } catch (error) {
    logger.error('Error starting batch summarization:', error);
    res.status(500).json({ success: false, error: 'Failed to start batch summarization' });
  }
});

export default router;
