require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const calendarRoutes = require('./routes/calendar');
const noteRoutes = require('./routes/notes');
const apiRoutes = require('./routes/api');

const notificationAgent = require('./agents/notificationAgent');
const shortTermMemory = require('./memory/shortTerm');

const app = express();
const server = http.createServer(app);

// Use trust proxy for production (Render/Heroku/etc)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', calendarRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('authenticate', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`[Socket] User ${userId} joined room`);
  });

  socket.on('message', async (data) => {
    const { userId, message, sessionId } = data;
    const orchestrator = require('./agents/orchestrator');
    const result = await orchestrator.processMessage(userId, message, sessionId);
    socket.emit('response', result);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

setInterval(() => {
  notificationAgent.processQueue();
  shortTermMemory.cleanup();
}, 60000);

cron.schedule('0 8 * * *', async () => {
  console.log('[Cron] Triggering daily summaries for all active users...');
  try {
    const User = require('./models/User');
    const users = await User.find({ 'preferences.dailySummary': true });
    
    console.log(`[Cron] Found ${users.length} users with summary enabled.`);

    for (const user of users) {
      try {
        console.log(`[Cron] Processing summary for: ${user.username}`);
        await notificationAgent.sendDailySummary(user._id);
        
        // Notify via socket if connected
        io.to(`user_${user._id}`).emit('notification', {
          type: 'daily_summary',
          message: 'Your daily summary has been sent to your registered channels.',
          timestamp: new Date()
        });
      } catch (userError) {
        console.error(`[Cron] Error processing summary for user ${user.username}:`, userError.message);
      }
    }
    console.log('[Cron] Daily summary run completed.');
  } catch (err) {
    console.error('[Cron] Critical error in daily summary job:', err.message);
  }
});

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jarvis';

const startServer = async () => {
  // Listen immediately so healthchecks pass
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] JARVIS running on http://0.0.0.0:${PORT}`);
    console.log('[Status] Starting background initializations...');
  });

  try {
    console.log('[MongoDB] Connecting to cluster...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('[MongoDB] Connected successfully');
    
    // Initialize bots
    const whatsapp = require('./bots/whatsapp');
    whatsapp.initializeWhatsApp();
    
    console.log('[Mode] Multi-agent system fully online');
  } catch (err) {
    console.error('[Startup] Initialization error:', err.message);
    console.log('[Mode] Running in limited/demo mode');
  }
};

startServer();

module.exports = { app, io };