# Railway Configuration for Email Copilot

This project deploys three services on Railway:
1. **server** - Express API backend
2. **web** - React frontend
3. **worker** - Background job processor

## Prerequisites

1. PostgreSQL database
2. Redis instance
3. Environment variables configured

## Services

### Server Service
- Build Command: `cd packages/server && npm install && npm run build`
- Start Command: `cd packages/server && npm start`
- Port: 3000

### Web Service
- Build Command: `cd packages/web && npm install && npm run build`
- Start Command: `npx serve -s dist -l 5173`
- Port: 5173

### Worker Service
- Build Command: `cd packages/worker && npm install && npm run build`
- Start Command: `cd packages/worker && npm start`
- No public port

## Environment Variables

### Server
```
DATABASE_URL=<PostgreSQL connection string>
REDIS_URL=<Redis connection string>
JWT_SECRET=<random secret>
MICROSOFT_CLIENT_ID=<from Azure AD>
MICROSOFT_CLIENT_SECRET=<from Azure AD>
MICROSOFT_CALLBACK_URL=https://your-server.railway.app/api/auth/microsoft/callback
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
GOOGLE_CALLBACK_URL=https://your-server.railway.app/api/auth/google/callback
OPENAI_API_KEY=<from OpenAI>
FRONTEND_URL=https://your-web.railway.app
NODE_ENV=production
```

### Worker
```
DATABASE_URL=<PostgreSQL connection string>
REDIS_URL=<Redis connection string>
OPENAI_API_KEY=<from OpenAI>
NODE_ENV=production
```

### Web
```
VITE_API_URL=https://your-server.railway.app
```

## Deployment Steps

1. Connect your repository to Railway
2. Create three services from the same repo
3. Configure each service with appropriate build/start commands
4. Add PostgreSQL and Redis plugins
5. Set environment variables for each service
6. Deploy!
