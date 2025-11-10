# Email Copilot

AI-powered email assistant that connects to Outlook (Microsoft Graph) and Gmail to read, classify, and summarize emails, draft replies from shorthand input, and learn user tone automatically.

## Features

- 🔐 **OAuth Authentication** - Secure login with Microsoft and Google
- 📧 **Email Sync** - Automatic synchronization of emails from Outlook/Gmail
- 🤖 **AI Summarization** - Get concise summaries of long emails with key points
- 📝 **Smart Draft Replies** - Generate replies from shorthand instructions
- 🎯 **Tone Learning** - AI learns your writing style from sent emails
- 🏷️ **Auto Classification** - Automatically categorize emails
- ⚡ **Real-time Updates** - Background workers for async processing

## Architecture

```
email-copilot/
├── packages/
│   ├── shared/       # Shared TypeScript types
│   ├── server/       # Express API + Prisma
│   ├── worker/       # BullMQ background jobs
│   └── web/          # React + Vite frontend
```

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, React Query
- **Backend**: Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Queue**: Redis + BullMQ
- **AI**: OpenAI GPT-4
- **Email APIs**: Microsoft Graph, Gmail API
- **Deployment**: Railway (3 services)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- OpenAI API key
- Microsoft Azure AD app (for Outlook)
- Google Cloud project (for Gmail, optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/PulseWorks-Ltd/MyAIssistant.git
cd MyAIssistant
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` files in each package and fill in your credentials:
- `packages/server/.env`
- `packages/worker/.env`
- `packages/web/.env`

4. Set up the database:
```bash
npm run db:generate
npm run db:migrate
```

5. Start development servers:
```bash
# Terminal 1 - Server
cd packages/server
npm run dev

# Terminal 2 - Worker
cd packages/worker
npm run dev

# Terminal 3 - Web
cd packages/web
npm run dev
```

6. Open http://localhost:5173 in your browser

## Configuration

### Microsoft OAuth (Outlook)

1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Add redirect URI: `http://localhost:3000/api/auth/microsoft/callback`
4. Add API permissions: `User.Read`, `Mail.Read`, `Mail.Send`, `offline_access`
5. Copy Client ID and Secret to `.env`

### Google OAuth (Gmail - Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project and enable Gmail API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Copy Client ID and Secret to `.env`

### OpenAI

1. Get API key from [OpenAI Platform](https://platform.openai.com)
2. Add to `.env` files

## Deployment

See [RAILWAY.md](./RAILWAY.md) for detailed Railway deployment instructions.

### Quick Deploy

1. Push code to GitHub
2. Connect repo to Railway
3. Create 3 services: server, web, worker
4. Add PostgreSQL and Redis plugins
5. Configure environment variables
6. Deploy!

## Usage

1. **Login** - Sign in with Microsoft or Google
2. **Sync Emails** - Click "Sync Emails" to import your inbox
3. **View Summary** - Click any email and generate AI summary
4. **Draft Reply** - Use shorthand like "Accept meeting tomorrow at 2pm" to generate full replies
5. **Learn Tone** - Go to settings and analyze your sent emails to teach the AI your writing style

## API Endpoints

### Authentication
- `GET /api/auth/microsoft` - Initiate Microsoft OAuth
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/me` - Get current user

### Emails
- `GET /api/emails` - List emails
- `GET /api/emails/:id` - Get email details
- `POST /api/emails/sync` - Trigger email sync
- `POST /api/emails/send` - Send email

### AI
- `POST /api/ai/summarize/:emailId` - Summarize email
- `POST /api/ai/draft-reply` - Generate draft reply
- `POST /api/ai/learn-tone` - Learn user's tone
- `GET /api/ai/tone-profile` - Get tone profile

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Project Structure

```
packages/
├── shared/
│   └── src/
│       └── types.ts          # Shared TypeScript types
├── server/
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── src/
│       ├── routes/           # API routes
│       ├── services/         # Business logic
│       ├── middleware/       # Express middleware
│       └── utils/            # Utilities
├── worker/
│   └── src/
│       └── workers/          # Background job processors
└── web/
    └── src/
        ├── components/       # React components
        ├── pages/            # Page components
        ├── services/         # API client
        └── stores/           # State management
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
