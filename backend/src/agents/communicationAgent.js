const longTermMemory = require('../memory/longTerm');

class CommunicationAgent {
  constructor() {
    this.name = 'CommunicationAgent';
    this.connectedClients = new Map();
  }

  async execute(userId, action, params) {
    const startTime = Date.now();
    
    try {
      let result;
      switch (action) {
        case 'send_whatsapp':
          result = await this.sendWhatsApp(params);
          break;
        case 'send_telegram':
          result = await this.sendTelegram(params);
          break;
        case 'broadcast':
          result = await this.broadcast(params);
          break;
        case 'get_history':
          result = await this.getMessageHistory(userId, params);
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

  async sendWhatsApp(params) {
    const { to, message } = params;
    console.log(`[WhatsApp] Sending to ${to}: ${message}`);
    return {
      success: true,
      channel: 'whatsapp',
      to,
      message,
      timestamp: new Date()
    };
  }

  async sendTelegram(params) {
    const { chatId, message } = params;
    console.log(`[Telegram] Sending to ${chatId}: ${message}`);
    return {
      success: true,
      channel: 'telegram',
      chatId,
      message,
      timestamp: new Date()
    };
  }

  async broadcast(params) {
    const { userIds, message, channels = ['web'] } = params;
    const results = [];

    for (const userId of userIds) {
      for (const channel of channels) {
        if (channel === 'whatsapp') {
          results.push(await this.sendWhatsApp({ to: userId, message }));
        } else if (channel === 'telegram') {
          results.push(await this.sendTelegram({ chatId: userId, message }));
        }
      }
    }

    return {
      total: userIds.length,
      successful: results.filter(r => r.success).length,
      results
    };
  }

  async getMessageHistory(userId, params) {
    const { limit = 20 } = params;
    return await longTermMemory.getConversations(userId, limit);
  }

  handleIncomingMessage(source, from, message) {
    console.log(`[${source}] Received from ${from}: ${message}`);
    return {
      source,
      from,
      message,
      timestamp: new Date(),
      readyForProcessing: true
    };
  }
}

module.exports = new CommunicationAgent();