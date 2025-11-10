# Email Copilot - Architecture

## Overview

Email Copilot is a TypeScript monorepo application that provides AI-powered email assistance. The system is designed as a distributed architecture with three main services.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Web App (Vite)                                   │ │
│  │  - Login/OAuth                                          │ │
│  │  - Email List & Detail Views                           │ │
│  │  - AI Summarization UI                                 │ │
│  │  - Draft Reply Generator                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API Layer (Express)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Authentication Routes                                  │ │
│  │  - Microsoft OAuth (passport-microsoft)                │ │
│  │  - Google OAuth (passport-google)                      │ │
│  │  - JWT Token Management                                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Email Routes                                          │ │
│  │  - List/Get/Send Emails                               │ │
│  │  - Trigger Sync                                        │ │
│  │  - Mark as Read                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AI Routes                                             │ │
│  │  - Summarize Email                                     │ │
│  │  - Generate Draft Reply                                │ │
│  │  - Learn User Tone                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│   Email Provider APIs     │   │    Background Workers    │
│  ┌─────────────────────┐  │   │  ┌────────────────────┐ │
│  │ Microsoft Graph API │  │   │  │ Email Sync Worker  │ │
│  │ - Read Emails       │  │   │  │ - Fetch emails     │ │
│  │ - Send Emails       │  │   │  │ - Save to DB       │ │
│  │ - Get Sent Items    │  │   │  └────────────────────┘ │
│  └─────────────────────┘  │   │  ┌────────────────────┐ │
│  ┌─────────────────────┐  │   │  │ AI Process Worker  │ │
│  │ Gmail API           │  │   │  │ - Summarize        │ │
│  │ - Read Emails       │  │   │  │ - Classify         │ │
│  │ - Send Emails       │  │   │  │ - Learn Tone       │ │
│  │ - Get Sent Items    │  │   │  └────────────────────┘ │
│  └─────────────────────┘  │   └──────────────────────────┘
└───────────────────────────┘                │
                                             │
                ┌────────────────────────────┤
                │                            │
                ▼                            ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│   OpenAI API              │   │    Redis Queue           │
│  ┌─────────────────────┐  │   │  - BullMQ                │
│  │ GPT-4 Turbo         │  │   │  - Job Management        │
│  │ - Summarization     │  │   │  - Retry Logic           │
│  │ - Classification    │  │   └──────────────────────────┘
│  │ - Tone Analysis     │  │
│  │ - Reply Generation  │  │
│  └─────────────────────┘  │
└───────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer (PostgreSQL)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Users         - User accounts & OAuth tokens          │ │
│  │  Emails        - Email content & metadata              │ │
│  │  EmailSummary  - AI-generated summaries                │ │
│  │  DraftReply    - Generated reply drafts                │ │
│  │  ToneProfile   - Learned writing style                 │ │
│  │  SyncLog       - Sync history & status                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Web Package (`packages/web`)

**Technology**: React 18, Vite, TypeScript, TailwindCSS, React Query

**Responsibilities**:
- User interface for email management
- OAuth login flow
- Email list and detail views
- AI feature interactions
- State management with Zustand

**Key Features**:
- Server-side authentication with JWT
- Real-time email sync status
- AI summary display
- Draft reply generation UI

### 2. Server Package (`packages/server`)

**Technology**: Express, TypeScript, Prisma, Passport.js

**Responsibilities**:
- RESTful API endpoints
- OAuth authentication
- Email provider integration
- Database operations
- Queue job creation

**Key Endpoints**:
- `POST /api/auth/microsoft` - Microsoft OAuth
- `POST /api/auth/google` - Google OAuth
- `GET /api/emails` - List emails
- `POST /api/emails/sync` - Trigger sync
- `POST /api/ai/summarize/:id` - Summarize email
- `POST /api/ai/draft-reply` - Generate reply

### 3. Worker Package (`packages/worker`)

**Technology**: BullMQ, TypeScript, Prisma, OpenAI SDK

**Responsibilities**:
- Background email synchronization
- AI processing tasks
- Retry failed jobs
- Queue management

**Workers**:
1. **Email Sync Worker**: Fetches emails from providers and saves to database
2. **AI Processing Worker**: Runs AI tasks (summarization, classification, tone learning)

### 4. Shared Package (`packages/shared`)

**Technology**: TypeScript

**Responsibilities**:
- Common TypeScript types
- Shared interfaces
- Type definitions for API responses

## Data Flow

### Email Sync Flow

```
User clicks "Sync" → API creates job → Worker fetches emails → Save to DB → Update UI
```

1. User triggers sync via web UI
2. Server creates a job in Redis queue
3. Worker picks up the job
4. Worker fetches emails from Microsoft Graph or Gmail API
5. Worker saves emails to PostgreSQL
6. Web UI polls for updates and displays new emails

### AI Summarization Flow

```
User views email → Click summarize → Check cache → Generate summary → Display
```

1. User selects an email
2. User clicks "Generate AI Summary"
3. Server checks if summary exists in database
4. If not, creates AI processing job
5. Worker calls OpenAI API with email content
6. Worker saves summary to database
7. Web UI displays the summary

### Draft Reply Flow

```
User enters shorthand → Generate → Apply tone → Display → Edit → Send
```

1. User enters shorthand instructions (e.g., "Accept meeting at 2pm")
2. Server fetches user's tone profile from database
3. Server calls OpenAI API with:
   - Original email context
   - Shorthand instructions
   - User's tone profile
4. OpenAI generates full reply
5. Server saves draft and returns to user
6. User can edit and send the reply

## Database Schema

### Users
- Stores user accounts
- OAuth tokens (encrypted)
- Provider information (outlook/gmail)

### Emails
- Email content and metadata
- Links to user
- External ID for deduplication

### EmailSummary
- AI-generated summaries
- Key points extraction
- Sentiment and urgency classification

### ToneProfile
- User's writing style characteristics
- Learned from sent emails
- Used for reply generation

### DraftReply
- Generated reply drafts
- Links to original email
- Tone used for generation

### SyncLog
- Sync operation history
- Success/failure tracking
- Error messages

## Security Considerations

1. **Authentication**:
   - OAuth 2.0 for email providers
   - JWT for API authentication
   - Secure token storage

2. **Data Protection**:
   - Encrypted OAuth tokens in database
   - HTTPS for all communications
   - CORS restrictions

3. **API Keys**:
   - Environment variables for secrets
   - No hardcoded credentials
   - Separate keys per environment

## Scalability

1. **Horizontal Scaling**:
   - Multiple worker instances for parallel processing
   - Stateless API servers
   - Redis for distributed job queue

2. **Performance**:
   - Database indexing on common queries
   - Caching with Redis
   - Batch email processing

3. **Reliability**:
   - Job retry logic
   - Error logging
   - Health check endpoints

## Deployment Architecture (Railway)

```
┌─────────────────────────────────────────────────────────────┐
│                         Railway                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Web       │  │   Server     │  │   Worker     │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  │  Port: 5173  │  │  Port: 3000  │  │   (no port)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                   │             │
│         └────────┬────────┴──────┬───────────┘             │
│                  │                │                          │
│         ┌────────▼────────┐  ┌───▼──────────┐             │
│         │   PostgreSQL     │  │    Redis     │             │
│         │     Plugin       │  │    Plugin    │             │
│         └──────────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

Each service:
- Has its own environment variables
- Auto-deploys on git push
- Has separate build and start commands
- Shares PostgreSQL and Redis instances

## Development Workflow

1. **Local Development**:
   ```bash
   # Terminal 1
   cd packages/server && npm run dev
   
   # Terminal 2
   cd packages/worker && npm run dev
   
   # Terminal 3
   cd packages/web && npm run dev
   ```

2. **Building**:
   ```bash
   npm run build  # Builds all packages with Turbo
   ```

3. **Database Changes**:
   ```bash
   cd packages/server
   # Edit prisma/schema.prisma
   npm run db:migrate
   npm run db:generate
   ```

## Technology Choices

### Why TypeScript?
- Type safety across the entire codebase
- Better IDE support and autocomplete
- Catch errors at compile time

### Why Monorepo?
- Shared code and types
- Consistent tooling
- Atomic commits across packages

### Why BullMQ?
- Robust job queue with Redis
- Retry mechanisms
- Job prioritization and scheduling

### Why Prisma?
- Type-safe database access
- Easy migrations
- Great TypeScript integration

### Why React Query?
- Caching and data synchronization
- Automatic refetching
- Optimistic updates

## Future Enhancements

1. **Email Features**:
   - Email templates
   - Scheduled sends
   - Email filters and rules
   - Attachment handling

2. **AI Features**:
   - Smart categorization
   - Priority inbox
   - Follow-up reminders
   - Email insights dashboard

3. **Integration**:
   - Slack notifications
   - Calendar integration
   - CRM integration
   - Mobile app

4. **Performance**:
   - Email search with Elasticsearch
   - Real-time updates with WebSockets
   - Advanced caching strategies
