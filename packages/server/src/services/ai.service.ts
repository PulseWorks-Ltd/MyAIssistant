import OpenAI from 'openai';
import { EmailSummary, DraftReply, UserToneProfile } from '@email-copilot/shared';
import logger from '../utils/logger';
import prisma from '../utils/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIService {
  async summarizeEmail(emailId: string, subject: string, body: string): Promise<EmailSummary> {
    try {
      const prompt = `Analyze the following email and provide:
1. A concise summary (2-3 sentences)
2. Key points (bullet points)
3. Sentiment (positive/neutral/negative)
4. Urgency level (low/medium/high)
5. Suggested category

Email Subject: ${subject}
Email Body: ${body}

Respond in JSON format with keys: summary, keyPoints (array), sentiment, urgency, category`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email analyst. Analyze emails and provide structured insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(content);

      return {
        emailId,
        summary: analysis.summary || 'No summary available',
        keyPoints: analysis.keyPoints || [],
        sentiment: analysis.sentiment || 'neutral',
        urgency: analysis.urgency || 'medium',
        category: analysis.category,
      };
    } catch (error) {
      logger.error('Error summarizing email:', error);
      throw error;
    }
  }

  async classifyEmail(subject: string, body: string): Promise<string> {
    try {
      const prompt = `Classify this email into one of these categories:
- Work/Professional
- Personal
- Marketing/Promotional
- Social/Notifications
- Finance
- Travel
- Shopping
- Other

Email Subject: ${subject}
Email Body: ${body.substring(0, 500)}

Return only the category name.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an email classifier. Respond with only the category name.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 20,
      });

      return response.choices[0]?.message?.content?.trim() || 'Other';
    } catch (error) {
      logger.error('Error classifying email:', error);
      return 'Other';
    }
  }

  async generateReply(
    emailId: string,
    originalSubject: string,
    originalBody: string,
    shorthand: string,
    userId: string
  ): Promise<DraftReply> {
    try {
      // Get user's tone profile
      const toneProfile = await prisma.toneProfile.findUnique({
        where: { userId },
      });

      const toneInstructions = this.buildToneInstructions(toneProfile);

      const prompt = `Generate a professional email reply based on the shorthand input.

Original Email Subject: ${originalSubject}
Original Email Body: ${originalBody.substring(0, 1000)}

Shorthand Reply: ${shorthand}

${toneInstructions}

Generate a complete, well-formatted email reply that expands on the shorthand while maintaining the user's tone and style.`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email writer. Generate professional, contextual email replies.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const generatedReply = response.choices[0]?.message?.content || '';

      return {
        emailId,
        shorthand,
        generatedReply,
        tone: this.describeTone(toneProfile),
      };
    } catch (error) {
      logger.error('Error generating reply:', error);
      throw error;
    }
  }

  async learnToneFromSentEmails(userId: string, sentEmails: string[]): Promise<UserToneProfile> {
    try {
      const sampledEmails = sentEmails.slice(0, 10).join('\n\n---\n\n');

      const prompt = `Analyze these sent emails and extract the writing style characteristics:

${sampledEmails}

Provide analysis in JSON format with:
- formalityLevel: 0-1 (0=casual, 1=very formal)
- averageLength: average word count
- commonPhrases: array of frequently used phrases
- signatureStyle: description of how they sign off

Respond in JSON format.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in writing style analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(content);

      const toneProfile: UserToneProfile = {
        userId,
        formalityLevel: analysis.formalityLevel || 0.5,
        averageLength: analysis.averageLength || 100,
        commonPhrases: analysis.commonPhrases || [],
        signatureStyle: analysis.signatureStyle || '',
        updatedAt: new Date(),
      };

      // Save to database
      await prisma.toneProfile.upsert({
        where: { userId },
        create: {
          ...toneProfile,
          sampleCount: sentEmails.length,
        },
        update: {
          ...toneProfile,
          sampleCount: sentEmails.length,
        },
      });

      return toneProfile;
    } catch (error) {
      logger.error('Error learning tone from sent emails:', error);
      throw error;
    }
  }

  private buildToneInstructions(toneProfile: any): string {
    if (!toneProfile) {
      return 'Use a professional, friendly tone.';
    }

    const formality =
      toneProfile.formalityLevel > 0.7
        ? 'very formal and professional'
        : toneProfile.formalityLevel > 0.4
        ? 'professional but friendly'
        : 'casual and conversational';

    const length =
      toneProfile.averageLength > 150
        ? 'detailed and comprehensive'
        : toneProfile.averageLength > 80
        ? 'moderate length'
        : 'concise and brief';

    return `Tone Instructions:
- Writing style: ${formality}
- Response length: ${length} (aim for ~${toneProfile.averageLength} words)
- Common phrases to use: ${toneProfile.commonPhrases.slice(0, 3).join(', ')}
- Sign-off style: ${toneProfile.signatureStyle}`;
  }

  private describeTone(toneProfile: any): string {
    if (!toneProfile) return 'professional';

    if (toneProfile.formalityLevel > 0.7) return 'formal';
    if (toneProfile.formalityLevel > 0.4) return 'professional';
    return 'casual';
  }
}

export default new AIService();
