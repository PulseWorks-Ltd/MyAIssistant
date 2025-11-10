// Email types
export interface Email {
  id: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  body: string;
  bodyPreview: string;
  receivedDateTime: Date;
  hasAttachments: boolean;
  isRead: boolean;
  importance: 'low' | 'normal' | 'high';
  categories?: string[];
  conversationId?: string;
}

export interface EmailSummary {
  emailId: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
  category?: string;
}

export interface DraftReply {
  emailId: string;
  shorthand: string;
  generatedReply: string;
  tone: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'outlook' | 'gmail';
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserToneProfile {
  userId: string;
  formalityLevel: number; // 0-1
  averageLength: number;
  commonPhrases: string[];
  signatureStyle: string;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Queue job types
export interface EmailSyncJob {
  userId: string;
  provider: 'outlook' | 'gmail';
  syncType: 'full' | 'incremental';
  lastSyncTime?: Date;
}

export interface AIProcessingJob {
  emailId: string;
  userId: string;
  taskType: 'summarize' | 'classify' | 'draft_reply';
  input?: any;
}

// Configuration types
export interface EmailProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}
