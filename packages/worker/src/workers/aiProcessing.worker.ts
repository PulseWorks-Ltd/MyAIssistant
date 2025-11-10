import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { AIProcessingJob } from '@email-copilot/shared';
import OpenAI from 'openai';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIProcessingWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'ai-processing',
      async (job: Job<AIProcessingJob>) => {
        return this.processAITask(job);
      },
      {
        connection,
        concurrency: 3,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`AI processing job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`AI processing job ${job?.id} failed:`, err);
    });
  }

  private async processAITask(job: Job<AIProcessingJob>): Promise<void> {
    const { taskType, emailId, userId } = job.data;

    logger.info(`Processing AI task: ${taskType} for email ${emailId || 'N/A'}`);

    switch (taskType) {
      case 'summarize':
        await this.summarizeEmail(emailId);
        break;
      case 'classify':
        await this.classifyEmail(emailId);
        break;
      case 'draft_reply':
        // Handled synchronously in API
        break;
      default:
        if (taskType === 'learn_tone') {
          await this.learnTone(userId);
        }
    }
  }

  private async summarizeEmail(emailId: string): Promise<void> {
    const email = await prisma.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    // Check if summary already exists
    const existingSummary = await prisma.emailSummary.findUnique({
      where: { emailId },
    });

    if (existingSummary) {
      logger.info(`Summary already exists for email ${emailId}`);
      return;
    }

    const prompt = `Analyze the following email and provide:
1. A concise summary (2-3 sentences)
2. Key points (bullet points)
3. Sentiment (positive/neutral/negative)
4. Urgency level (low/medium/high)
5. Suggested category

Email Subject: ${email.subject}
Email Body: ${email.body.substring(0, 2000)}

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

    await prisma.emailSummary.create({
      data: {
        emailId,
        summary: analysis.summary || 'No summary available',
        keyPoints: analysis.keyPoints || [],
        sentiment: analysis.sentiment || 'neutral',
        urgency: analysis.urgency || 'medium',
        category: analysis.category,
      },
    });

    logger.info(`Email ${emailId} summarized successfully`);
  }

  private async classifyEmail(emailId: string): Promise<void> {
    const email = await prisma.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    const prompt = `Classify this email into one of these categories:
- Work/Professional
- Personal
- Marketing/Promotional
- Social/Notifications
- Finance
- Travel
- Shopping
- Other

Email Subject: ${email.subject}
Email Body: ${email.body.substring(0, 500)}

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

    const category = response.choices[0]?.message?.content?.trim() || 'Other';

    // Update email or summary with category
    await prisma.email.update({
      where: { id: emailId },
      data: {
        categories: [category],
      },
    });

    logger.info(`Email ${emailId} classified as ${category}`);
  }

  private async learnTone(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.accessToken) {
      throw new Error('User not found or not authenticated');
    }

    // Fetch sent emails from database
    const sentEmails = await prisma.email.findMany({
      where: {
        userId,
        from: user.email,
      },
      orderBy: { receivedDateTime: 'desc' },
      take: 20,
      select: { body: true },
    });

    if (sentEmails.length === 0) {
      logger.warn(`No sent emails found for user ${userId}`);
      return;
    }

    const emailBodies = sentEmails.map((e) => e.body).filter(Boolean);
    const sampledEmails = emailBodies.slice(0, 10).join('\n\n---\n\n');

    const prompt = `Analyze these sent emails and extract the writing style characteristics:

${sampledEmails}

Provide analysis in JSON format with:
- formalityLevel: 0-1 (0=casual, 1=very formal)
- averageLength: average word count
- commonPhrases: array of frequently used phrases (max 5)
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

    await prisma.toneProfile.upsert({
      where: { userId },
      create: {
        userId,
        formalityLevel: analysis.formalityLevel || 0.5,
        averageLength: analysis.averageLength || 100,
        commonPhrases: analysis.commonPhrases || [],
        signatureStyle: analysis.signatureStyle || '',
        sampleCount: emailBodies.length,
      },
      update: {
        formalityLevel: analysis.formalityLevel || 0.5,
        averageLength: analysis.averageLength || 100,
        commonPhrases: analysis.commonPhrases || [],
        signatureStyle: analysis.signatureStyle || '',
        sampleCount: emailBodies.length,
      },
    });

    logger.info(`Tone profile learned for user ${userId}`);
  }

  close() {
    return this.worker.close();
  }
}

export default AIProcessingWorker;
