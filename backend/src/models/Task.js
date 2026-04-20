const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  dueDate: { type: Date },
  dueTime: { type: String },
  category: { type: String, default: 'general' },
  tags: [{ type: String }],
  subtasks: [{
    title: { type: String },
    completed: { type: Boolean, default: false }
  }],
  estimatedDuration: { type: Number },
  actualDuration: { type: Number },
  reminders: [{
    type: { type: String, enum: ['notification', 'email', 'whatsapp', 'telegram'] },
    time: { type: Date }
  }],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);