const mongoose = require('mongoose');

const agentLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  agentName: { type: String, required: true },
  action: { type: String, required: true },
  input: { type: mongoose.Schema.Types.Mixed },
  output: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['success', 'error', 'pending'], default: 'success' },
  executionTime: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

agentLogSchema.index({ userId: 1, timestamp: -1 });
agentLogSchema.index({ agentName: 1, timestamp: -1 });

module.exports = mongoose.model('AgentLog', agentLogSchema);