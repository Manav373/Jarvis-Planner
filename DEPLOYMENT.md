# 🚀 JARVIS AI System - Deployment Guide

## Prerequisites
- Node.js 18+
- MongoDB Atlas account
- OpenAI API key (optional for AI features)

---

## Backend Deployment (Render/Railway)

### Option 1: Render.com (Free)

1. **Create Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Deploy Backend**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder
   - Configure:
     - Build Command: `npm install`
     - Start Command: `npm start`
   - Add Environment Variables:
     ```
     MONGODB_URI=your-mongodb-atlas-uri
     OPENAI_API_KEY=your-openai-key
     JWT_SECRET=your-secret-key
     PORT=3001
     ```

3. **Deploy Frontend**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Select the `frontend` folder
   - Add Environment Variable:
     ```
     NEXT_PUBLIC_API_URL=your-backend-url
     ```

### Option 2: Railway

1. **Create Account**
   - Go to [railway.app](https://railway.app)

2. **Deploy**
   - Click "New Project"
   - Connect GitHub repo
   - Add environment variables in Railway dashboard

---

## Database Setup (MongoDB Atlas)

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create free cluster

2. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `password` with your actual password

3. **Configure Backend**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jarvis
   ```

---

## Voice Assistant Setup

The voice assistant uses browser Web Speech API:
- Chrome: Full support
- Firefox: Limited support
- Safari: Limited support

---

## WhatsApp Integration

1. Install dependencies:
   ```bash
   npm install whatsapp-web.js
   ```

2. Start backend - it will show QR code
3. Scan QR with WhatsApp to authenticate
4. WhatsApp messages will be processed by JARVIS

---

## Telegram Bot Setup

1. Create bot via @BotFather on Telegram
2. Get the bot token
3. Add to environment variables:
   ```
   TELEGRAM_BOT_TOKEN=your-telegram-token
   ```
4. Start backend - bot will be active

---

## Environment Variables Summary

### Backend (.env)
```env
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
JWT_SECRET=your-super-secret
TELEGRAM_BOT_TOKEN=12345:ABCDE
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

---

## Running Locally

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## Testing the System

1. **Register** a new account
2. **Add tasks** via the UI or chat
3. **Create events** on the calendar
4. **Add notes** in the notes section
5. **Chat with JARVIS** - try "Plan my day"
6. **Use voice** - click the microphone and speak

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET/POST | /api/tasks | Tasks CRUD |
| GET/POST | /api/events | Events CRUD |
| GET/POST | /api/notes | Notes CRUD |
| POST | /api/query | AI chat |
| POST | /api/workflow | Execute workflow |
| GET | /api/analytics | Get analytics |

---

## Troubleshooting

**MongoDB Connection Error**
- Check your connection string
- Ensure IP whitelist includes 0.0.0.0/0

**OpenAI Error**
- Verify API key is valid
- Check quota limits

**Voice Not Working**
- Use Chrome browser
- Allow microphone permissions

**WebSocket Issues**
- Ensure your hosting supports WebSockets
- Check firewall settings