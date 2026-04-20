const axios = require('axios');
const toolRegistry = require('../mcp/tools');
const shortTermMemory = require('../memory/shortTerm');
const longTermMemory = require('../memory/longTerm');

let groqClient = null;
if (process.env.GROQ_API_KEY) {
  groqClient = axios.create({
    baseURL: 'https://api.groq.com/openai/v1',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
}

class OrchestratorAgent {
  constructor() {
    this.name = 'Orchestrator';
    this.systemPrompt = `You are JARVIS, an intelligent AI assistant. Your role is to:
1. Understand user intent
2. Break complex requests into manageable steps
3. Coordinate with specialized agents (TaskAgent, CalendarAgent, NotesAgent, KnowledgeAgent, NotificationAgent, CommunicationAgent)
4. Use available tools to fulfill user requests
5. Maintain context and provide personalized responses

Available tools:
- get_tasks, create_task, update_task, delete_task
- get_events, create_event
- get_notes, create_note, update_note
- search_knowledge
- send_notification
- schedule_reminder
- get_analytics

Always respond in a helpful, concise manner. When a user asks to "plan my day" or similar:
1. Fetch their tasks and events
2. Prioritize tasks intelligently
3. Create a schedule
4. Confirm with user before saving`;

    this.intentPatterns = {
      'plan_day': ['plan my day', 'plan tomorrow', 'schedule my day', 'what\'s on today'],
      'add_task': ['add task', 'create task', 'new task', 'remind me to'],
      'add_event': ['add event', 'schedule meeting', 'book', 'appointment'],
      'add_note': ['add note', 'write note', 'remember that', 'jot down'],
      'get_tasks': ['show tasks', 'my tasks', 'todo list', 'what do i have'],
      'get_events': ['calendar', 'events', 'meetings', 'appointments'],
      'search': ['search', 'find', 'look up', 'what is', 'how to'],
      'notify': ['remind me', 'notify', 'alert']
    };
  }

  async analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern)) {
          return intent;
        }
      }
    }
    return 'general';
  }

  extractEntities(message, intent) {
    const entities = {};
    
    const datePattern = /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)/i;
    const dateMatch = message.match(datePattern);
    if (dateMatch) entities.date = dateMatch[0];

    const timePattern = /(\d{1,2}:\d{2})\s*(am|pm)?/i;
    const timeMatch = message.match(timePattern);
    if (timeMatch) entities.time = timeMatch[0];

    const priorityPattern = /(urgent|high priority|important|low priority)/i;
    const priorityMatch = message.match(priorityPattern);
    if (priorityMatch) entities.priority = priorityMatch[0].toLowerCase().includes('urgent') ? 'urgent' :
      priorityMatch[0].toLowerCase().includes('high') ? 'high' : 'low';

    const taskMatch = message.match(/(?:add|create|new|remind me to)\s+(.+?)(?:\s+at|\s+on|\s+by|$)/i);
    if (taskMatch) entities.task = taskMatch[1].trim();

    return entities;
  }

  async processMessage(userId, message, sessionId = null) {
    const startTime = Date.now();
    
    try {
      if (!sessionId) {
        sessionId = shortTermMemory.createSession(userId);
      }

      const intent = await this.analyzeIntent(message);
      const entities = this.extractEntities(message, intent);

      shortTermMemory.updateContext(sessionId, { intent, entities });

      await longTermMemory.logAgentAction(userId, this.name, 'analyze_intent', { message, intent }, { entities }, 'success', Date.now() - startTime);

      let response;
      switch (intent) {
        case 'plan_day':
          response = await this.handlePlanDay(userId, entities);
          break;
        case 'add_task':
          response = await this.handleAddTask(userId, message, entities);
          break;
        case 'add_event':
          response = await this.handleAddEvent(userId, message, entities);
          break;
        case 'add_note':
          response = await this.handleAddNote(userId, message, entities);
          break;
        case 'get_tasks':
          response = await this.handleGetTasks(userId);
          break;
        case 'get_events':
          response = await this.handleGetEvents(userId);
          break;
        case 'search':
          response = await this.handleSearch(entities);
          break;
        default:
          response = await this.handleGeneralQuery(userId, message, sessionId);
      }

      shortTermMemory.addMessage(sessionId, 'assistant', response.message);
      await longTermMemory.logAgentAction(userId, this.name, 'respond', { message, intent }, response, 'success', Date.now() - startTime);

      return {
        ...response,
        sessionId,
        intent,
        entities
      };

    } catch (error) {
      await longTermMemory.logAgentAction(userId, this.name, 'error', { message }, { error: error.message }, 'error', Date.now() - startTime);
      return {
        success: false,
        message: `I encountered an error: ${error.message}`,
        sessionId
      };
    }
  }

  async handlePlanDay(userId, entities) {
    const date = entities.date || 'today';
    const tasks = await toolRegistry.executeTool('get_tasks', { userId, status: 'pending' });
    const events = await toolRegistry.executeTool('get_events', { 
      userId,
      startDate: date === 'today' ? new Date().toISOString() : undefined,
      endDate: date === 'today' ? new Date().toISOString() : undefined
    });

    const priorityTasks = tasks
      .filter(t => t.priority === 'urgent' || t.priority === 'high')
      .slice(0, 5);

    const schedule = this.optimizeSchedule(priorityTasks, events);

    return {
      success: true,
      message: `Here's your plan for ${date}:\n\n` +
        `🎯 Priority Tasks (${priorityTasks.length}):\n` +
        priorityTasks.map((t, i) => `${i + 1}. ${t.title} [${t.priority}]`).join('\n') +
        `\n\n📅 Events (${events.length}):\n` +
        events.map((e, i) => `${i + 1}. ${e.title} at ${new Date(e.startTime).toLocaleTimeString()}`).join('\n') +
        `\n\n🤖 AI Suggestion: ${schedule.suggestion}`,
      data: { tasks: priorityTasks, events, schedule }
    };
  }

  optimizeSchedule(tasks, events) {
    const totalTasks = tasks.length;
    const totalEvents = events.length;
    const freeSlots = 24 - (totalEvents * 2);
    
    let suggestion = '';
    if (totalTasks > freeSlots) {
      suggestion = `You have ${totalTasks} high-priority tasks but only ${freeSlots} hours of free time. Consider rescheduling some tasks.`;
    } else if (totalTasks === 0) {
      suggestion = 'No pending tasks. Your day looks free!';
    } else {
      suggestion = `Your schedule looks balanced. Start with the most important task.`;
    }

    return { suggestion, totalTasks, totalEvents, freeSlots };
  }

  async handleAddTask(userId, message, entities) {
    const title = entities.task || message.replace(/^(add task|create task|new task|remind me to)\s+/i, '');
    
    const result = await toolRegistry.executeTool('create_task', {
      userId,
      title: title.trim(),
      priority: entities.priority || 'medium',
      dueDate: entities.date || new Date().toISOString()
    });

    return {
      success: true,
      message: `✅ Task created: "${title.trim()}"\nPriority: ${entities.priority || 'medium'}`,
      data: result
    };
  }

  async handleAddEvent(userId, message, entities) {
    const title = message.replace(/^(add event|schedule meeting|book|appointment)\s+/i, '');
    
    const startTime = entities.time ? new Date(`${entities.date || 'today'} ${entities.time}`) : new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const result = await toolRegistry.executeTool('create_event', {
      userId,
      title: title.trim(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    return {
      success: true,
      message: `📅 Event created: "${title.trim()}" at ${startTime.toLocaleTimeString()}`,
      data: result
    };
  }

  async handleAddNote(userId, message, entities) {
    const title = message.replace(/^(add note|write note|remember that|jot down)\s+/i, '').slice(0, 50);
    
    const result = await toolRegistry.executeTool('create_note', {
      userId,
      title: title.trim() || 'Untitled Note',
      content: message
    });

    return {
      success: true,
      message: `📝 Note created: "${title.trim()}"`,
      data: result
    };
  }

  async handleGetTasks(userId) {
    const tasks = await toolRegistry.executeTool('get_tasks', { userId, status: 'pending' });
    
    return {
      success: true,
      message: `You have ${tasks.length} pending tasks:\n\n` +
        tasks.slice(0, 10).map((t, i) => `${i + 1}. ${t.title} [${t.priority}]`).join('\n'),
      data: tasks
    };
  }

  async handleGetEvents(userId) {
    const events = await toolRegistry.executeTool('get_events', { userId });
    
    return {
      success: true,
      message: `You have ${events.length} upcoming events:\n\n` +
        events.slice(0, 10).map((e, i) => `${i + 1}. ${e.title} - ${new Date(e.startTime).toLocaleString()}`).join('\n'),
      data: events
    };
  }

  async handleSearch(entities) {
    const query = entities.task || 'general information';
    const result = await toolRegistry.executeTool('search_knowledge', { query });
    
    return {
      success: true,
      message: result,
      data: result
    };
  }

  async handleGeneralQuery(userId, message, sessionId = null) {
    if (!groqClient) {
      return {
        success: true,
        message: "I'm JARVIS, your AI assistant. Configure GROQ_API_KEY in .env for AI responses. You can still use me for task management, calendar, and notes!",
        data: null
      };
    }
    
    try {
      let historyMessages = [];
      if (sessionId && sessionId.startsWith('session_')) {
        // Short term session
        historyMessages = shortTermMemory.sessions.get(sessionId)?.messages || [];
      } else if (sessionId) {
        // Long term conversation ID
        const conv = await longTermMemory.getConversationById(userId, sessionId);
        if (conv) {
          historyMessages = conv.messages;
        }
      }

      const formattedHistory = historyMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await groqClient.post('/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...formattedHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024
      });
      
      return {
        success: true,
        message: response.data.choices[0].message.content,
        data: null
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error?.message || error.message,
        data: null
      };
    }
  }

  async executeWorkflow(userId, workflow, params) {
    const results = [];
    
    for (const step of workflow.steps) {
      const agent = this.getAgent(step.agent);
      if (agent) {
        const result = await agent.execute(userId, step.action, params);
        results.push({ step: step.name, result });
      }
    }

    return results;
  }

  getAgent(agentName) {
    const agents = {
      'task': require('./taskAgent'),
      'calendar': require('./calendarAgent'),
      'notes': require('./notesAgent'),
      'knowledge': require('./knowledgeAgent'),
      'notification': require('./notificationAgent'),
      'communication': require('./communicationAgent')
    };
    return agents[agentName];
  }
}

module.exports = new OrchestratorAgent();