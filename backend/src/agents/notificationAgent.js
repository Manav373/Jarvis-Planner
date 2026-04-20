const toolRegistry = require('../mcp/tools');
const longTermMemory = require('../memory/longTerm');

class NotificationAgent {
  constructor() {
    this.name = 'NotificationAgent';
    this.notificationQueue = [];
  }

  async execute(userId, action, params) {
    const startTime = Date.now();
    
    try {
      let result;
      switch (action) {
        case 'send':
          result = await this.sendNotification(userId, params);
          break;
        case 'schedule':
          result = await this.scheduleNotification(userId, params);
          break;
        case 'get_pending':
          result = await this.getPendingNotifications(userId);
          break;
        case 'send_daily_summary':
          result = await this.sendDailySummary(userId);
          break;
        case 'send_task_reminder':
          result = await this.sendTaskReminder(userId, params);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      await longTermMemory.logAgentAction(userId, this.name, action, params, result, 'success', Date.now() - startTime);
      return result;

    } catch (error) {
      await longTermMemory.logAgentAction(userId, this.name, action, params, { error: error.message }, 'error', Date.now() - startTime);
      throw error;
    }
  }

  async sendNotification(userId, params) {
    const { message, title = 'JARVIS AI', type = 'info', channels = ['web'] } = params;
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) return { success: false, error: 'User not found' };
    
    const notification = {
      userId,
      message,
      title,
      type,
      channels,
      timestamp: new Date(),
      status: 'processed'
    };

    const results = [];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'web':
          case 'push':
            if (user.pushTokens && user.pushTokens.length > 0) {
              const { admin } = require('../config/firebase');
              const messagePayload = {
                notification: { title, body: message },
                data: { type, timestamp: new Date().toISOString() },
                tokens: user.pushTokens
              };
              const response = await admin.messaging().sendMulticast(messagePayload);
              results.push({ channel: 'push', success: response.successCount > 0, response });
            }
            break;
          case 'email':
            if (user.preferences?.emailNotifications) {
              const emailService = require('../services/emailService');
              const emailRes = await emailService.sendEmail(user.email, title, `<p>${message}</p>`);
              results.push({ channel: 'email', success: emailRes.success });
            }
            break;
          case 'telegram':
            const telRes = await this.sendTelegram(userId, message);
            results.push({ channel: 'telegram', success: telRes.sent });
            break;
          case 'whatsapp':
            const waRes = await this.sendWhatsApp(userId, message);
            results.push({ channel: 'whatsapp', success: waRes.sent });
            break;
        }
      } catch (err) {
        console.error(`[NotificationAgent] Error on channel ${channel}:`, err.message);
        results.push({ channel, success: false, error: err.message });
      }
    }

    return { ...notification, results };
  }

  async scheduleNotification(userId, params) {
    const { message, scheduledTime, type = 'reminder', repeat } = params;
    
    const scheduled = {
      userId,
      message,
      scheduledTime: new Date(scheduledTime),
      type,
      repeat,
      status: 'scheduled'
    };

    this.notificationQueue.push(scheduled);
    
    await toolRegistry.executeTool('schedule_reminder', {
      userId,
      itemId: scheduled._id,
      itemType: 'notification',
      reminderTime: scheduledTime
    });

    return scheduled;
  }

  async getPendingNotifications(userId) {
    return this.notificationQueue.filter(n => 
      n.userId.toString() === userId.toString() && n.status === 'scheduled'
    );
  }

  async sendDailySummary(userId) {
    const analytics = await toolRegistry.executeTool('get_analytics', { userId, period: 'day' });
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    const message = `📊 Daily Summary:\n` +
      `✅ Tasks completed: ${analytics.tasksCompleted}\n` +
      `📝 Tasks created: ${analytics.tasksCreated}\n` +
      `📅 Events: ${analytics.eventsCount}\n` +
      `⚡ Productivity: ${analytics.productivityScore}%`;

    // 1. Send push/web notification
    await this.sendNotification(userId, { message, type: 'summary', channels: ['web', 'push'] });

    // 2. Send detailed email summary if preferred
    if (user && user.preferences?.dailySummary && user.preferences?.emailNotifications) {
      const emailService = require('../services/emailService');
      await emailService.sendDailySummary(user, analytics);
    }

    return { message, success: true };
  }

  async sendTaskReminder(userId, params) {
    const { taskId } = params;
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);
    
    if (task) {
      const message = `⏰ Reminder: "${task.title}" is due ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'soon'}`;
      return await this.sendNotification(userId, { message, type: 'reminder' });
    }
    return null;
  }

  async sendTelegram(userId, message) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (user && user.telegramId) {
      console.log(`[Telegram] Sending to ${user.telegramId}: ${message}`);
      return { sent: true, channel: 'telegram' };
    }
    return { sent: false, reason: 'No Telegram ID' };
  }

  async sendWhatsApp(userId, message) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (user && user.whatsappNumber) {
      console.log(`[WhatsApp] Sending to ${user.whatsappNumber}: ${message}`);
      return { sent: true, channel: 'whatsapp' };
    }
    return { sent: false, reason: 'No WhatsApp number' };
  }

  processQueue() {
    const now = new Date();
    this.notificationQueue = this.notificationQueue.filter(notification => {
      if (new Date(notification.scheduledTime) <= now) {
        this.sendNotification(notification.userId, { message: notification.message });
        return false;
      }
      return true;
    });
  }
}

module.exports = new NotificationAgent();