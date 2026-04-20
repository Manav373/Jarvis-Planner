const Conversation = require('../models/Conversation');
const AgentLog = require('../models/AgentLog');

class LongTermMemory {
  async saveConversation(userId, messages, context = {}, title = 'New Chat', channel = 'web') {
    const conversation = new Conversation({
      userId,
      title,
      messages,
      context,
      channel
    });
    return await conversation.save();
  }

  async getConversations(userId, limit = 50) {
    return await Conversation.find({ userId, isActive: true })
      .select('title updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .limit(limit);
  }

  async getConversationById(userId, conversationId) {
    return await Conversation.findOne({ _id: conversationId, userId, isActive: true });
  }

  async deleteConversation(userId, conversationId) {
    return await Conversation.findOneAndUpdate(
      { _id: conversationId, userId },
      { isActive: false },
      { new: true }
    );
  }

  async updateConversationTitle(conversationId, title) {
    return await Conversation.findByIdAndUpdate(conversationId, { title }, { new: true });
  }

  async getRecentMessages(userId, conversationId, limit = 20) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return [];
    return conversation.messages.slice(-limit);
  }

  async addMessageToConversation(conversationId, role, content, metadata = {}) {
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.messages.push({ role, content, timestamp: new Date(), metadata });
      conversation.updatedAt = new Date();
      return await conversation.save();
    }
    return null;
  }

  async logAgentAction(userId, agentName, action, input, output, status = 'success', executionTime = 0) {
    const log = new AgentLog({
      userId,
      agentName,
      action,
      input,
      output,
      status,
      executionTime
    });
    return await log.save();
  }

  async getAgentLogs(userId, agentName = null, limit = 50) {
    const query = { userId };
    if (agentName) query.agentName = agentName;
    return await AgentLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  async learnFromInteraction(userId, intent, entities, response) {
    const conversation = await Conversation.findOne({ userId, isActive: true, 'context.intent': intent });
    if (conversation) {
      const existingEntities = conversation.context.entities || {};
      conversation.context.entities = { ...existingEntities, ...entities, learned: true };
      await conversation.save();
    }
  }

  async getUserBehaviorPatterns(userId) {
    const logs = await AgentLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(100);
    
    const patterns = {
      frequentActions: [],
      preferredTimes: [],
      commonIntents: []
    };

    logs.forEach(log => {
      if (!patterns.frequentActions.includes(log.action)) {
        patterns.frequentActions.push(log.action);
      }
    });

    return patterns;
  }
}

module.exports = new LongTermMemory();