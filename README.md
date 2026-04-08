# 🤖 JARVIS AI System - Multi-Agent Intelligent Assistant

## 🎯 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │Dashboard │ │ Tasks    │ │ Calendar │ │  Notes   │ │ Chat    │    │
│  │  View    │ │ Manager  │ │   View   │ │  Editor  │ │ Interface│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│           │                              │                              │
│           │         VOICE (Jarvis)       │                              │
│           │   "Jarvis, plan my day"      │                              │
│           └──────────────────────────────┘                              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST API + WebSocket
┌────────────────────────────────────┴────────────────────────────────────┐
│                         BACKEND (Express + Node.js)                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ORCHESTRATOR AGENT                           │   │
│  │  • Intent Analysis  • Task Decomposition  • Agent Coordination  │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────────┐  │
│  │Task  │ │Cal   │ │Notes │ │Knowl │ │Notif │ │Comm  │ │  Memory   │  │
│  │Agent │ │Agent │ │Agent │ │Agent │ │Agent │ │Agent │ │  System   │  │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └─────┬────┘  │
│     │        │        │        │        │        │            │        │
│     └────────┴────────┴────────┴────────┴────────┴────────────┘        │
│                                    │                                    │
│                    ┌──────────────┴───────────────┐                    │
│                    │      MCP TOOL INTEGRATION     │                    │
│                    │  • Google Calendar (Mock)    │                    │
│                    │  • Task Manager (Mock)       │                    │
│                    │  • Notes System (Mock)       │                    │
│                    │  • WhatsApp/Telegram API     │                    │
│                    └──────────────────────────────┘                    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                      DATABASE (MongoDB Atlas)                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Users │ │ Tasks │ │Events │ │ Notes  │ │Converstns│ │AgentLogs │  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📁 Folder Structure

```
jarvis-ai-system/
├── backend/
│   ├── src/
│   │   ├── agents/           # AI Agent implementations
│   │   │   ├── orchestrator.js
│   │   │   ├── taskAgent.js
│   │   │   ├── calendarAgent.js
│   │   │   ├── notesAgent.js
│   │   │   ├── knowledgeAgent.js
│   │   │   ├── notificationAgent.js
│   │   │   └── communicationAgent.js
│   │   ├── mcp/              # MCP Tool integrations
│   │   │   ├── tools.js
│   │   │   └── toolRegistry.js
│   │   ├── memory/           # Memory system
│   │   │   ├── shortTerm.js
│   │   │   └── longTerm.js
│   │   ├── routes/           # API routes
│   │   │   ├── api.js
│   │   │   ├── tasks.js
│   │   │   ├── calendar.js
│   │   │   ├── notes.js
│   │   │   └── auth.js
│   │   ├── models/           # Database models
│   │   │   ├── User.js
│   │   │   ├── Task.js
│   │   │   ├── Event.js
│   │   │   ├── Note.js
│   │   │   └── Conversation.js
│   │   ├── services/         # Business logic
│   │   │   ├── workflowEngine.js
│   │   │   ├── openai.js
│   │   │   └── websocket.js
│   │   ├── bots/             # Messaging bots
│   │   │   ├── whatsapp.js
│   │   │   └── telegram.js
│   │   └── index.js          # Entry point
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Dashboard/
│   │   │   ├── Tasks/
│   │   │   ├── Calendar/
│   │   │   ├── Notes/
│   │   │   ├── Chat/
│   │   │   └── Voice/
│   │   ├── pages/
│   │   │   ├── index.js
│   │   │   ├── dashboard.js
│   │   │   ├── tasks.js
│   │   │   ├── calendar.js
│   │   │   └── notes.js
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   ├── package.json
│   └── next.config.js
└── README.md
```

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
# Configure .env with MongoDB URI and OpenAI key
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🎙️ Voice Commands
- "Jarvis" - Wake word
- "Plan my day" - Generate daily schedule
- "Add task [task]" - Create new task
- "What's on my calendar" - Show events

## 🔗 API Endpoints
- `POST /api/query` - AI interaction
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET/POST /api/tasks` - Task CRUD
- `GET/POST /api/events` - Calendar events
- `GET/POST /api/notes` - Notes CRUD
- `GET /api/analytics` - Admin analytics

## 📦 Deployment (Free)
- Backend: Render.com / Railway
- Frontend: Vercel
- Database: MongoDB Atlas# Jarvis-Planner
