import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import aiRoutes from './routes/ai.routes';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-copilot-server' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/ai', aiRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
