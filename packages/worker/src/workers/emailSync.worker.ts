import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { EmailSyncJob } from '@email-copilot/shared';
import logger from '../utils/logger';

// Import services from server (reuse or duplicate)
import { Client } from '@microsoft/microsoft-graph-client';
import { google } from 'googleapis';

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

class EmailSyncWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'email-sync',
      async (job: Job<EmailSyncJob>) => {
        return this.processSync(job);
      },
      {
        connection,
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Email sync job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Email sync job ${job?.id} failed:`, err);
    });
  }

  private async processSync(job: Job<EmailSyncJob>): Promise<void> {
    const { userId, provider, syncType, lastSyncTime } = job.data;

    logger.info(`Starting email sync for user ${userId} (${provider})`);

    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        provider,
        syncType,
        status: 'in_progress',
      },
    });

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.accessToken) {
        throw new Error('User not found or not authenticated');
      }

      let emails: any[] = [];

      if (provider === 'outlook') {
        emails = await this.fetchOutlookEmails(user.accessToken, lastSyncTime);
      } else if (provider === 'gmail') {
        emails = await this.fetchGmailEmails(user.accessToken, lastSyncTime);
      }

      // Save emails to database
      let savedCount = 0;
      for (const email of emails) {
        try {
          await prisma.email.upsert({
            where: {
              userId_externalId: {
                userId: user.id,
                externalId: email.id,
              },
            },
            create: {
              userId: user.id,
              externalId: email.id,
              subject: email.subject,
              from: email.from,
              to: email.to,
              cc: email.cc || [],
              body: email.body,
              bodyPreview: email.bodyPreview,
              receivedDateTime: email.receivedDateTime,
              hasAttachments: email.hasAttachments,
              isRead: email.isRead,
              importance: email.importance,
              categories: email.categories || [],
              conversationId: email.conversationId,
            },
            update: {
              isRead: email.isRead,
              importance: email.importance,
              categories: email.categories || [],
            },
          });
          savedCount++;
        } catch (error) {
          logger.error(`Error saving email ${email.id}:`, error);
        }
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'success',
          emailsCount: savedCount,
          completedAt: new Date(),
        },
      });

      logger.info(`Email sync completed: ${savedCount} emails processed`);
    } catch (error: any) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async fetchOutlookEmails(accessToken: string, sinceDate?: Date): Promise<any[]> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    let request = client
      .api('/me/messages')
      .top(100)
      .select('id,subject,from,toRecipients,ccRecipients,body,bodyPreview,receivedDateTime,hasAttachments,isRead,importance,categories,conversationId')
      .orderby('receivedDateTime DESC');

    if (sinceDate) {
      request = request.filter(`receivedDateTime ge ${sinceDate.toISOString()}`);
    }

    const response = await request.get();
    return response.value.map((msg: any) => ({
      id: msg.id,
      subject: msg.subject || '(No Subject)',
      from: msg.from?.emailAddress?.address || '',
      to: msg.toRecipients?.map((r: any) => r.emailAddress.address) || [],
      cc: msg.ccRecipients?.map((r: any) => r.emailAddress.address) || [],
      body: msg.body?.content || '',
      bodyPreview: msg.bodyPreview || '',
      receivedDateTime: new Date(msg.receivedDateTime),
      hasAttachments: msg.hasAttachments || false,
      isRead: msg.isRead || false,
      importance: msg.importance || 'normal',
      categories: msg.categories || [],
      conversationId: msg.conversationId,
    }));
  }

  private async fetchGmailEmails(accessToken: string, sinceDate?: Date): Promise<any[]> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let query = 'in:inbox';
    if (sinceDate) {
      const afterTimestamp = Math.floor(sinceDate.getTime() / 1000);
      query += ` after:${afterTimestamp}`;
    }

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
      q: query,
    });

    const messages = response.data.messages || [];
    const emails: any[] = [];

    for (const message of messages) {
      if (message.id) {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });

          const headers = fullMessage.data.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          let body = '';
          if (fullMessage.data.payload?.body?.data) {
            body = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
          }

          emails.push({
            id: fullMessage.data.id || '',
            subject: getHeader('subject') || '(No Subject)',
            from: getHeader('from'),
            to: getHeader('to').split(',').map((e: string) => e.trim()),
            cc: getHeader('cc').split(',').map((e: string) => e.trim()).filter(Boolean),
            body,
            bodyPreview: fullMessage.data.snippet || '',
            receivedDateTime: new Date(parseInt(fullMessage.data.internalDate || '0')),
            hasAttachments: fullMessage.data.payload?.parts?.some((p: any) => p.filename) || false,
            isRead: !fullMessage.data.labelIds?.includes('UNREAD'),
            importance: fullMessage.data.labelIds?.includes('IMPORTANT') ? 'high' : 'normal',
            categories: fullMessage.data.labelIds || [],
          });
        } catch (error) {
          logger.error(`Error fetching Gmail message ${message.id}:`, error);
        }
      }
    }

    return emails;
  }

  close() {
    return this.worker.close();
  }
}

export default EmailSyncWorker;
