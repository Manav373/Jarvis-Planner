require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const notificationAgent = require('./src/agents/notificationAgent');
const { initializeFirebase } = require('./src/config/firebase');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jarvis';

async function testSummary() {
  try {
    console.log('--- Notification System Test ---');
    
    // 1. Connect to DB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 2. Init Firebase
    initializeFirebase();

    // 3. Find a test user (or pick the first one)
    const user = await User.findOne();
    if (!user) {
      console.log('No user found to test with.');
      return;
    }

    console.log(`Testing with user: ${user.username}`);
    console.log(`Preferences: `, user.preferences);

    // 4. Trigger summary
    console.log('Triggering daily summary...');
    const result = await notificationAgent.sendDailySummary(user._id);
    
    console.log('Test result:', result);
    console.log('Check logs for FCM and Email delivery status.');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    mongoose.disconnect();
  }
}

testSummary();
