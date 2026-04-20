const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, default: 'New Chat' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: {
      agent: { type: String },
      action: { type: String }
    }
  }],
  context: {
    intent: { type: String },
    entities: { type: mongoose.Schema.Types.Mixed },
    workflowSteps: [{ type: String }]
  },
  channel: { type: String, enum: ['web', 'telegram', 'whatsapp', 'voice'], default: 'web' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

conversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);