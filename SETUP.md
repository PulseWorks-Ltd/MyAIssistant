# Setup Guide

This guide will help you set up the Email Copilot application from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm 9+
- **PostgreSQL** 14+
- **Redis** 6+
- **Git**

You'll also need accounts for:
- **OpenAI** (for GPT-4 API)
- **Microsoft Azure** (for Outlook integration)
- **Google Cloud** (optional, for Gmail integration)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/PulseWorks-Ltd/MyAIssistant.git
cd MyAIssistant

# Install dependencies
npm install
```

## Step 2: Set Up PostgreSQL Database

Create a new PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE email_copilot;

# Create user (optional)
CREATE USER email_copilot_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE email_copilot TO email_copilot_user;

# Exit
\q
```

## Step 3: Set Up Redis

If you don't have Redis running locally:

```bash
# Using Docker (recommended for development)
docker run -d -p 6379:6379 redis:7-alpine

# Or install Redis locally (macOS with Homebrew)
brew install redis
brew services start redis

# Or install Redis locally (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis
```

## Step 4: Configure Microsoft OAuth (Outlook)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" → "App registrations" → "New registration"
3. Fill in the details:
   - **Name**: Email Copilot
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web → `http://localhost:3000/api/auth/microsoft/callback`
4. Click "Register"
5. Note down the **Application (client) ID**
6. Go to "Certificates & secrets" → "New client secret"
7. Note down the **Client secret value** (you can only see it once!)
8. Go to "API permissions" → "Add a permission" → "Microsoft Graph" → "Delegated permissions"
9. Add these permissions:
   - `User.Read`
   - `Mail.Read`
   - `Mail.Send`
   - `offline_access`
10. Click "Grant admin consent" if required

## Step 5: Configure Google OAuth (Gmail - Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Configure consent screen if needed
   - Application type: Web application
   - Name: Email Copilot
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Note down the **Client ID** and **Client secret**

## Step 6: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign in or create an account
3. Go to "API keys"
4. Click "Create new secret key"
5. Note down the key (you can only see it once!)

## Step 7: Configure Environment Variables

### Server

Copy the example file and fill in your credentials:

```bash
cd packages/server
cp .env.example .env
```

Edit `packages/server/.env`:

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/email_copilot

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-random-secret-key-at-least-32-characters-long

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-azure-client-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:3000/api/auth/microsoft/callback

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# Logging
LOG_LEVEL=info
```

### Worker

```bash
cd ../worker
cp .env.example .env
```

Edit `packages/worker/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/email_copilot

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# Logging
LOG_LEVEL=info
```

### Web

```bash
cd ../web
cp .env.example .env
```

Edit `packages/web/.env`:

```env
VITE_API_URL=http://localhost:3000
```

## Step 8: Set Up Database Schema

Run Prisma migrations to create the database schema:

```bash
cd ../../
npm run db:generate
npm run db:migrate
```

When prompted, enter a name for the migration (e.g., "initial_schema").

## Step 9: Build the Project

Build all packages:

```bash
npm run build
```

## Step 10: Start Development Servers

Open 3 terminal windows:

### Terminal 1 - Server
```bash
cd packages/server
npm run dev
```

The server will start on http://localhost:3000

### Terminal 2 - Worker
```bash
cd packages/worker
npm run dev
```

The worker will start processing background jobs.

### Terminal 3 - Web
```bash
cd packages/web
npm run dev
```

The web app will start on http://localhost:5173

## Step 11: Test the Application

1. Open your browser and go to http://localhost:5173
2. Click "Sign in with Microsoft" or "Sign in with Google"
3. Complete the OAuth flow
4. You should be redirected back to the dashboard
5. Click "Sync Emails" to import your emails
6. Click on an email to view details
7. Click "Generate AI Summary" to see AI-powered summarization
8. Try the "Reply with AI" feature

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection string
psql "postgresql://postgres:password@localhost:5432/email_copilot"
```

### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping
# Should return "PONG"
```

### OAuth Redirect Issues

Make sure your redirect URIs match exactly in:
- Azure/Google Cloud console
- Your `.env` files

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Build Errors

```bash
# Clean all builds
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Build again
npm run build
```

## Production Deployment

See [RAILWAY.md](./RAILWAY.md) for Railway deployment instructions.

For other platforms, ensure you:
1. Set all environment variables
2. Run database migrations
3. Build all packages
4. Start server, worker, and web services separately

## Next Steps

- Configure email filters and rules
- Customize AI prompts for your use case
- Set up monitoring and logging
- Add more OAuth providers
- Implement additional features

## Support

For issues, please check:
- GitHub Issues: https://github.com/PulseWorks-Ltd/MyAIssistant/issues
- Documentation: README.md
- Railway Guide: RAILWAY.md
