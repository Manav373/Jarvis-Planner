const TelegramBot = require('node-telegram-bot-api');
const orchestrator = require('../agents/orchestrator');

let bot = null;

const initializeTelegram = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.log('[Telegram] No bot token provided. Telegram bot disabled.');
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (text.startsWith('/')) {
      await handleCommand(chatId, text, msg);
      return;
    }

    console.log(`[Telegram] Message from ${chatId}: ${text}`);

    try {
      const userId = chatId.toString();
      const response = await orchestrator.processMessage(userId, text);
      
      await bot.sendMessage(chatId, response.message, {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            ['📋 My Tasks', '📅 My Calendar'],
            ['📝 Add Task', '💬 Chat with JARVIS']
          ],
          resize_keyboard: true
        }
      });
    } catch (error) {
      console.error('[Telegram] Error processing message:', error);
      bot.sendMessage(chatId, 'Sorry, I encountered an error. Please try again.');
    }
  });

  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    await bot.answerCallbackQuery(callbackQuery.id);
    
    switch (data) {
      case 'tasks':
        const taskAgent = require('../agents/taskAgent');
        const tasks = await taskAgent.execute(chatId.toString(), 'get_tasks', { status: 'pending' });
        await bot.sendMessage(chatId, formatTasks(tasks));
        break;
      case 'calendar':
        const calendarAgent = require('../agents/calendarAgent');
        const events = await calendarAgent.execute(chatId.toString(), 'get_events', {});
        await bot.sendMessage(chatId, formatEvents(events));
        break;
      default:
        break;
    }
  });

  bot.on('polling_error', (error) => {
    console.error('[Telegram] Polling error:', error.code, error.message);
  });

  console.log('[Telegram] Bot initialized and running');
  return bot;
};

const handleCommand = async (chatId, command, msg) => {
  const commands = {
    '/start': 'Welcome to JARVIS! Your AI assistant.\n\nCommands:\n/start - Start\n/tasks - View tasks\n/calendar - View calendar\n/add - Add a task\n/help - Help',
    '/help': 'Available commands:\n/start - Start\n/tasks - View pending tasks\n/calendar - View upcoming events\n/add [task] - Add new task\n/notes - View notes\n/summary - Get daily summary',
    '/tasks': async () => {
      const taskAgent = require('../agents/taskAgent');
      const tasks = await taskAgent.execute(chatId.toString(), 'get_tasks', { status: 'pending' });
      return formatTasks(tasks);
    },
    '/calendar': async () => {
      const calendarAgent = require('../agents/calendarAgent');
      const events = await calendarAgent.execute(chatId.toString(), 'get_events', {});
      return formatEvents(events);
    },
    '/summary': async () => {
      const notificationAgent = require('../agents/notificationAgent');
      const result = await notificationAgent.execute(chatId.toString(), 'send_daily_summary', {});
      return result.message || 'Summary sent!';
    }
  };

  const cmd = command.split(' ')[0].toLowerCase();
  
  if (commands[cmd]) {
    if (typeof commands[cmd] === 'function') {
      const result = await commands[cmd]();
      await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, commands[cmd], { parse_mode: 'Markdown' });
    }
  } else if (cmd === '/add') {
    const taskText = command.replace('/add', '').trim();
    if (taskText) {
      const taskAgent = require('../agents/taskAgent');
      await taskAgent.execute(chatId.toString(), 'create_task', { title: taskText });
      await bot.sendMessage(chatId, `✅ Task added: "${taskText}"`);
    } else {
      await bot.sendMessage(chatId, 'Usage: /add [task name]');
    }
  }
};

const formatTasks = (tasks) => {
  if (!tasks || tasks.length === 0) {
    return 'No pending tasks! 🎉';
  }
  
  let message = '📋 *Your Tasks*\n\n';
  tasks.slice(0, 10).forEach((task, i) => {
    const priority = task.priority === 'urgent' ? '🔴' : task.priority === 'high' ? '🟠' : '🟡';
    message += `${i + 1}. ${priority} ${task.title}\n`;
  });
  
  return message;
};

const formatEvents = (events) => {
  if (!events || events.length === 0) {
    return 'No upcoming events! 🎉';
  }
  
  let message = '📅 *Your Events*\n\n';
  events.slice(0, 10).forEach((event, i) => {
    const date = new Date(event.startTime).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric' 
    });
    const time = new Date(event.startTime).toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit' 
    });
    message += `${i + 1}. 📌 ${event.title}\n   📍 ${date} at ${time}\n\n`;
  });
  
  return message;
};

const sendTelegramMessage = async (chatId, message, options = {}) => {
  if (!bot) {
    console.log('[Telegram] Bot not initialized');
    return { success: false, reason: 'Bot not initialized' };
  }

  try {
    await bot.sendMessage(chatId, message, options);
    return { success: true, chatId, message };
  } catch (error) {
    console.error('[Telegram] Send error:', error);
    return { success: false, error: error.message };
  }
};

const getStatus = () => ({
  initialized: !!bot,
  ready: bot?.isPolling() || false
});

module.exports = {
  initializeTelegram,
  sendTelegramMessage,
  getStatus
};