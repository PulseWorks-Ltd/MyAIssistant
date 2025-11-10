import { Router, Response } from 'express';
import passport from 'passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../utils/prisma';
import { generateToken, AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Configure Microsoft OAuth
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3000/api/auth/microsoft/callback',
        scope: ['user.read', 'mail.read', 'mail.send', 'offline_access'],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const user = await prisma.user.upsert({
            where: { email: profile.emails[0].value },
            create: {
              email: profile.emails[0].value,
              name: profile.displayName,
              provider: 'outlook',
              accessToken,
              refreshToken,
              tokenExpiry: new Date(Date.now() + 3600 * 1000),
            },
            update: {
              accessToken,
              refreshToken,
              tokenExpiry: new Date(Date.now() + 3600 * 1000),
            },
          });
          done(null, user);
        } catch (error) {
          logger.error('Microsoft auth error:', error);
          done(error);
        }
      }
    )
  );
}

// Configure Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const user = await prisma.user.upsert({
            where: { email: profile.emails[0].value },
            create: {
              email: profile.emails[0].value,
              name: profile.displayName,
              provider: 'gmail',
              accessToken,
              refreshToken,
              tokenExpiry: new Date(Date.now() + 3600 * 1000),
            },
            update: {
              accessToken,
              refreshToken,
              tokenExpiry: new Date(Date.now() + 3600 * 1000),
            },
          });
          done(null, user);
        } catch (error) {
          logger.error('Google auth error:', error);
          done(error);
        }
      }
    )
  );
}

// Microsoft OAuth routes
router.get('/microsoft', passport.authenticate('microsoft'));

router.get(
  '/microsoft/callback',
  passport.authenticate('microsoft', { session: false, failureRedirect: '/login' }),
  (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const token = generateToken(user.id);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${token}`);
  }
);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const token = generateToken(user.id);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${token}`);
  }
);

// Get current user
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Decode token to get userId (simplified - use proper JWT verification in production)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production') as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Error fetching current user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

export default router;
