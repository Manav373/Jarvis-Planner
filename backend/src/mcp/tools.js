const { ToolRegistry } = require('./toolRegistry');

const toolRegistry = new ToolRegistry();

toolRegistry.register('get_tasks', {
  description: 'Get all tasks for a user',
  parameters: {
    userId: 'string',
    status: 'string (optional)',
    date: 'string (optional)'
  },
  handler: async (params) => {
    const Task = require('../models/Task');
    const query = { userId: params.userId };
    if (params.status) query.status = params.status;
    if (params.date) {
      const startOfDay = new Date(params.date);
      const endOfDay = new Date(params.date);
      endOfDay.setHours(23, 59, 59);
      query.dueDate = { $gte: startOfDay, $lte: endOfDay };
    }
    return await Task.find(query).sort({ priority: -1, dueDate: 1 });
  }
});

toolRegistry.register('create_task', {
  description: 'Create a new task',
  parameters: {
    userId: 'string',
    title: 'string',
    description: 'string (optional)',
    priority: 'string (optional)',
    dueDate: 'string (optional)',
    category: 'string (optional)'
  },
  handler: async (params) => {
    const Task = require('../models/Task');
    const task = new Task({
      userId: params.userId,
      title: params.title,
      description: params.description,
      priority: params.priority || 'medium',
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      category: params.category || 'general'
    });
    return await task.save();
  }
});

toolRegistry.register('update_task', {
  description: 'Update an existing task',
  parameters: {
    taskId: 'string',
    updates: 'object'
  },
  handler: async (params) => {
    const Task = require('../models/Task');
    return await Task.findByIdAndUpdate(params.taskId, params.updates, { new: true });
  }
});

toolRegistry.register('delete_task', {
  description: 'Delete a task',
  parameters: {
    taskId: 'string'
  },
  handler: async (params) => {
    const Task = require('../models/Task');
    return await Task.findByIdAndDelete(params.taskId);
  }
});

toolRegistry.register('get_events', {
  description: 'Get calendar events for a user',
  parameters: {
    userId: 'string',
    startDate: 'string (optional)',
    endDate: 'string (optional)'
  },
  handler: async (params) => {
    const Event = require('../models/Event');
    const query = { userId: params.userId };
    if (params.startDate || params.endDate) {
      query.startTime = {};
      if (params.startDate) query.startTime.$gte = new Date(params.startDate);
      if (params.endDate) query.startTime.$lte = new Date(params.endDate);
    }
    return await Event.find(query).sort({ startTime: 1 });
  }
});

toolRegistry.register('create_event', {
  description: 'Create a new calendar event',
  parameters: {
    userId: 'string',
    title: 'string',
    startTime: 'string',
    endTime: 'string',
    description: 'string (optional)',
    location: 'string (optional)',
    eventType: 'string (optional)'
  },
  handler: async (params) => {
    const Event = require('../models/Event');
    const event = new Event({
      userId: params.userId,
      title: params.title,
      description: params.description,
      startTime: new Date(params.startTime),
      endTime: new Date(params.endTime),
      location: params.location,
      eventType: params.eventType || 'other'
    });
    return await event.save();
  }
});

toolRegistry.register('get_notes', {
  description: 'Get notes for a user',
  parameters: {
    userId: 'string',
    category: 'string (optional)'
  },
  handler: async (params) => {
    const Note = require('../models/Note');
    const query = { userId: params.userId, isArchived: false };
    if (params.category) query.category = params.category;
    return await Note.find(query).sort({ isPinned: -1, updatedAt: -1 });
  }
});

toolRegistry.register('create_note', {
  description: 'Create a new note',
  parameters: {
    userId: 'string',
    title: 'string',
    content: 'string (optional)',
    category: 'string (optional)',
    tags: 'array (optional)'
  },
  handler: async (params) => {
    const Note = require('../models/Note');
    const note = new Note({
      userId: params.userId,
      title: params.title,
      content: params.content,
      category: params.category || 'general',
      tags: params.tags || []
    });
    return await note.save();
  }
});

toolRegistry.register('update_note', {
  description: 'Update a note',
  parameters: {
    noteId: 'string',
    updates: 'object'
  },
  handler: async (params) => {
    const Note = require('../models/Note');
    return await Note.findByIdAndUpdate(params.noteId, params.updates, { new: true });
  }
});

toolRegistry.register('search_knowledge', {
  description: 'Search external knowledge (mock)',
  parameters: {
    query: 'string'
  },
  handler: async (params) => {
    const mockData = {
      'weather': 'Current weather information: Sunny, 28°C',
      'news': 'Latest news: AI technology advancing rapidly',
      'default': `Information about "${params.query}": This is mock knowledge data. In production, this would connect to external APIs.`
    };
    return mockData[params.query.toLowerCase()] || mockData['default'];
  }
});

toolRegistry.register('send_notification', {
  description: 'Send a notification to user',
  parameters: {
    userId: 'string',
    message: 'string',
    type: 'string (optional)'
  },
  handler: async (params) => {
    return {
      sent: true,
      message: params.message,
      timestamp: new Date()
    };
  }
});

toolRegistry.register('schedule_reminder', {
  description: 'Schedule a reminder for a task or event',
  parameters: {
    userId: 'string',
    itemId: 'string',
    itemType: 'string (task or event)',
    reminderTime: 'string',
    reminderType: 'string (optional)'
  },
  handler: async (params) => {
    return {
      scheduled: true,
      itemId: params.itemId,
      itemType: params.itemType,
      reminderTime: params.reminderTime
    };
  }
});

toolRegistry.register('get_analytics', {
  description: 'Get user analytics',
  parameters: {
    userId: 'string',
    period: 'string (optional: day, week, month)'
  },
  handler: async (params) => {
    const Task = require('../models/Task');
    const Event = require('../models/Event');
    
    const now = new Date();
    let startDate = new Date(now);
    if (params.period === 'week') startDate.setDate(now.getDate() - 7);
    else if (params.period === 'month') startDate.setMonth(now.getMonth() - 1);
    else startDate.setDate(now.getDate() - 1);

    const [tasksCompleted, tasksCreated, eventsCount] = await Promise.all([
      Task.countDocuments({ userId: params.userId, status: 'completed', completedAt: { $gte: startDate } }),
      Task.countDocuments({ userId: params.userId, createdAt: { $gte: startDate } }),
      Event.countDocuments({ userId: params.userId, startTime: { $gte: startDate } })
    ]);

    return {
      tasksCompleted,
      tasksCreated,
      eventsCount,
      productivityScore: Math.round((tasksCompleted / (tasksCreated || 1)) * 100)
    };
  }
});

module.exports = toolRegistry;