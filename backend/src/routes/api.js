const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const orchestrator = require('../agents/orchestrator');
const workflowEngine = require('../services/workflowEngine');
const longTermMemory = require('../memory/longTerm');
const Task = require('../models/Task');
const Event = require('../models/Event');
const Note = require('../models/Note');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/query', authenticate, async (req, res) => {
  try {
    let { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let isNewConversation = false;
    if (!sessionId) {
      // Create new conversation
      const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
      const newConv = await longTermMemory.saveConversation(req.userId, [], {}, title);
      sessionId = newConv._id.toString();
      isNewConversation = true;
    }

    let result;
    try {
      result = await orchestrator.processMessage(req.userId, message, sessionId);
    } catch (orchError) {
      return res.status(500).json({ error: `Orchestrator error: ${orchError.message}` });
    }
    
    try {
      await longTermMemory.addMessageToConversation(sessionId, 'user', message);
      if (result.message) {
        await longTermMemory.addMessageToConversation(sessionId, 'assistant', result.message);
      }
    } catch (memError) {
      console.error('Memory save error:', memError.message);
    }
    
    res.json({
      response: result.message,
      success: result.success,
      sessionId: sessionId,
      isNew: isNewConversation,
      intent: result.intent,
      entities: result.entities,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflow', authenticate, async (req, res) => {
  try {
    const { workflowName, params } = req.body;
    
    if (!workflowName) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const result = await workflowEngine.execute(req.userId, workflowName, params);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workflows', authenticate, async (req, res) => {
  try {
    const workflows = workflowEngine.getWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const conversations = await longTermMemory.getConversations(req.userId, parseInt(limit));
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:id', authenticate, async (req, res) => {
  try {
    const conversation = await longTermMemory.getConversationById(req.userId, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/history/:id', authenticate, async (req, res) => {
  try {
    const result = await longTermMemory.deleteConversation(req.userId, req.params.id);
    if (!result) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs', authenticate, async (req, res) => {
  try {
    const { agent, limit = 50 } = req.query;
    const logs = await longTermMemory.getAgentLogs(req.userId, agent, parseInt(limit));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics', authenticate, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const now = new Date();
    let startDate = new Date(now);
    
    if (period === 'day') startDate.setDate(now.getDate() - 1);
    else if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);

    const [tasksCompleted, tasksPending, tasksOverdue, eventsCount, notesCount] = await Promise.all([
      Task.countDocuments({ userId: req.userId, status: 'completed', completedAt: { $gte: startDate } }),
      Task.countDocuments({ userId: req.userId, status: { $ne: 'completed' } }),
      Task.countDocuments({ userId: req.userId, status: 'pending', dueDate: { $lt: now } }),
      Event.countDocuments({ userId: req.userId, startTime: { $gte: startDate } }),
      Note.countDocuments({ userId: req.userId })
    ]);

    const productivityScore = tasksCompleted > 0 
      ? Math.round((tasksCompleted / (tasksCompleted + tasksPending)) * 100) 
      : 0;

    res.json({
      period,
      tasks: {
        completed: tasksCompleted,
        pending: tasksPending,
        overdue: tasksOverdue
      },
      events: eventsCount,
      notes: notesCount,
      productivityScore
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const suggestions = [];

    const pendingTasks = await Task.find({ 
      userId: req.userId, 
      status: { $ne: 'completed' } 
    }).sort({ priority: -1, dueDate: 1 }).limit(5);

    if (pendingTasks.length > 0) {
      suggestions.push({
        type: 'tasks',
        message: `You have ${pendingTasks.length} pending tasks`,
        items: pendingTasks.map(t => ({ id: t._id, title: t.title, priority: t.priority }))
      });
    }

    const now = new Date();
    const todayEvents = await Event.find({
      userId: req.userId,
      startTime: { $gte: new Date(now.setHours(0, 0, 0)), $lt: new Date(now.setHours(23, 59, 59)) }
    });

    if (todayEvents.length > 0) {
      suggestions.push({
        type: 'events',
        message: `You have ${todayEvents.length} events today`,
        items: todayEvents.map(e => ({ id: e._id, title: e.title, startTime: e.startTime }))
      });
    }

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;