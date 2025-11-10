import { Client } from '@microsoft/microsoft-graph-client';
import { Email } from '@email-copilot/shared';
import logger from '../utils/logger';

export class OutlookService {
  private getClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  async fetchEmails(accessToken: string, pageSize = 50): Promise<Email[]> {
    try {
      const client = this.getClient(accessToken);
      const response = await client
        .api('/me/messages')
        .top(pageSize)
        .select('id,subject,from,toRecipients,ccRecipients,body,bodyPreview,receivedDateTime,hasAttachments,isRead,importance,categories,conversationId')
        .orderby('receivedDateTime DESC')
        .get();

      return response.value.map((msg: any) => this.transformEmail(msg));
    } catch (error) {
      logger.error('Error fetching Outlook emails:', error);
      throw error;
    }
  }

  async fetchEmailsSince(accessToken: string, sinceDateTime: Date): Promise<Email[]> {
    try {
      const client = this.getClient(accessToken);
      const filterDate = sinceDateTime.toISOString();
      
      const response = await client
        .api('/me/messages')
        .filter(`receivedDateTime ge ${filterDate}`)
        .select('id,subject,from,toRecipients,ccRecipients,body,bodyPreview,receivedDateTime,hasAttachments,isRead,importance,categories,conversationId')
        .orderby('receivedDateTime DESC')
        .get();

      return response.value.map((msg: any) => this.transformEmail(msg));
    } catch (error) {
      logger.error('Error fetching Outlook emails since date:', error);
      throw error;
    }
  }

  async fetchSentEmails(accessToken: string, count = 20): Promise<Email[]> {
    try {
      const client = this.getClient(accessToken);
      const response = await client
        .api('/me/mailFolders/SentItems/messages')
        .top(count)
        .select('id,subject,from,toRecipients,ccRecipients,body,bodyPreview,sentDateTime,hasAttachments,importance')
        .orderby('sentDateTime DESC')
        .get();

      return response.value.map((msg: any) => this.transformEmail(msg, true));
    } catch (error) {
      logger.error('Error fetching sent emails:', error);
      throw error;
    }
  }

  async sendEmail(accessToken: string, to: string[], subject: string, body: string): Promise<void> {
    try {
      const client = this.getClient(accessToken);
      
      const message = {
        subject,
        body: {
          contentType: 'HTML',
          content: body,
        },
        toRecipients: to.map(email => ({
          emailAddress: { address: email }
        })),
      };

      await client.api('/me/sendMail').post({ message });
    } catch (error) {
      logger.error('Error sending email via Outlook:', error);
      throw error;
    }
  }

  private transformEmail(msg: any, isSent = false): Email {
    return {
      id: msg.id,
      subject: msg.subject || '(No Subject)',
      from: msg.from?.emailAddress?.address || '',
      to: msg.toRecipients?.map((r: any) => r.emailAddress.address) || [],
      cc: msg.ccRecipients?.map((r: any) => r.emailAddress.address) || [],
      body: msg.body?.content || '',
      bodyPreview: msg.bodyPreview || '',
      receivedDateTime: new Date(isSent ? msg.sentDateTime : msg.receivedDateTime),
      hasAttachments: msg.hasAttachments || false,
      isRead: msg.isRead || false,
      importance: msg.importance || 'normal',
      categories: msg.categories || [],
      conversationId: msg.conversationId,
    };
  }
}

export default new OutlookService();
