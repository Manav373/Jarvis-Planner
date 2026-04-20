const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String },
  avatar: { type: String },
  photoURL: { type: String },
  phone: { type: String },
  isGoogleAccount: { type: Boolean, default: false },
  preferences: {
    theme: { type: String, default: 'dark' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
    voiceEnabled: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: false }
  },
  pushTokens: [{ type: String }],
  telegramId: { type: String },
  whatsappNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);