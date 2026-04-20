const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  location: { type: String },
  eventType: { type: String, enum: ['meeting', 'reminder', 'deadline', 'personal', 'work', 'other'], default: 'other' },
  color: { type: String, default: '#6366f1' },
  isAllDay: { type: Boolean, default: false },
  recurring: {
    enabled: { type: Boolean, default: false },
    pattern: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    endDate: { type: Date }
  },
  attendees: [{ type: String }],
  reminders: [{
    type: { type: String, enum: ['notification', 'email', 'whatsapp', 'telegram'] },
    time: { type: Number, comment: 'minutes before event' }
  }],
  status: { type: String, enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

eventSchema.index({ userId: 1, startTime: 1 });

module.exports = mongoose.model('Event', eventSchema);