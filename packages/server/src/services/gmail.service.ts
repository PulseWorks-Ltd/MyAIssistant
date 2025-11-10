import { google } from 'googleapis';
import { Email } from '@email-copilot/shared';
import logger from '../utils/logger';

export class GmailService {
  private getClient(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async fetchEmails(accessToken: string, maxResults = 50): Promise<Email[]> {
    try {
      const gmail = this.getClient(accessToken);
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:inbox',
      });

      const messages = response.data.messages || [];
      const emails: Email[] = [];

      for (const message of messages) {
        if (message.id) {
          const email = await this.fetchEmailById(accessToken, message.id);
          if (email) emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      logger.error('Error fetching Gmail emails:', error);
      throw error;
    }
  }

  async fetchEmailById(accessToken: string, messageId: string): Promise<Email | null> {
    try {
      const gmail = this.getClient(accessToken);
      
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return this.transformEmail(response.data);
    } catch (error) {
      logger.error('Error fetching Gmail email by ID:', error);
      return null;
    }
  }

  async fetchSentEmails(accessToken: string, maxResults = 20): Promise<Email[]> {
    try {
      const gmail = this.getClient(accessToken);
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:sent',
      });

      const messages = response.data.messages || [];
      const emails: Email[] = [];

      for (const message of messages) {
        if (message.id) {
          const email = await this.fetchEmailById(accessToken, message.id);
          if (email) emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      logger.error('Error fetching sent Gmail emails:', error);
      throw error;
    }
  }

  async sendEmail(accessToken: string, to: string[], subject: string, body: string): Promise<void> {
    try {
      const gmail = this.getClient(accessToken);
      
      const email = [
        `To: ${to.join(', ')}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        '',
        body,
      ].join('\n');

      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });
    } catch (error) {
      logger.error('Error sending email via Gmail:', error);
      throw error;
    }
  }

  private transformEmail(msg: any): Email {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('subject');
    const from = getHeader('from');
    const to = getHeader('to').split(',').map((e: string) => e.trim());
    const cc = getHeader('cc').split(',').map((e: string) => e.trim()).filter(Boolean);

    let body = '';
    let bodyPreview = msg.snippet || '';

    if (msg.payload?.body?.data) {
      body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
    } else if (msg.payload?.parts) {
      const htmlPart = msg.payload.parts.find((p: any) => p.mimeType === 'text/html');
      const textPart = msg.payload.parts.find((p: any) => p.mimeType === 'text/plain');
      
      const part = htmlPart || textPart;
      if (part?.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      id: msg.id || '',
      subject: subject || '(No Subject)',
      from,
      to,
      cc,
      body,
      bodyPreview,
      receivedDateTime: new Date(parseInt(msg.internalDate || '0')),
      hasAttachments: msg.payload?.parts?.some((p: any) => p.filename) || false,
      isRead: !msg.labelIds?.includes('UNREAD'),
      importance: msg.labelIds?.includes('IMPORTANT') ? 'high' : 'normal',
      categories: msg.labelIds || [],
    };
  }
}

export default new GmailService();
