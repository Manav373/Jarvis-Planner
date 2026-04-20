const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const orchestrator = require('./agents/orchestrator');

let client = null;
let isReady = false;

const initializeWhatsApp = () => {
  const store = new MongoStore({ mongoose: mongoose });
  
  client = new Client({
    authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 300000
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log('[WhatsApp] QR Code received. Scan with your phone.');
    console.log(qr);
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Client is ready!');
    isReady = true;
  });

  client.on('message', async (message) => {
    if (message.from.includes('@c.us')) {
      console.log(`[WhatsApp] Message from ${message.from}: ${message.body}`);
      
      try {
        const response = await orchestrator.processMessage(
          message.from,
          message.body
        );
        
        await client.sendMessage(message.from, response.message);
        console.log(`[WhatsApp] Sent response to ${message.from}`);
      } catch (error) {
        console.error('[WhatsApp] Error processing message:', error);
        await client.sendMessage(message.from, 'Sorry, I encountered an error.');
      }
    }
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Client disconnected:', reason);
    isReady = false;
  });

  client.initialize().catch(err => {
    console.error('[WhatsApp] Initialization error:', err);
  });
};

const sendWhatsAppMessage = async (to, message) => {
  if (!isReady || !client) {
    console.log('[WhatsApp] Client not ready');
    return { success: false, reason: 'Client not ready' };
  }

  try {
    await client.sendMessage(to, message);
    return { success: true, to, message };
  } catch (error) {
    console.error('[WhatsApp] Send error:', error);
    return { success: false, error: error.message };
  }
};

const getStatus = () => ({
  initialized: !!client,
  ready: isReady
});

module.exports = {
  initializeWhatsApp,
  sendWhatsAppMessage,
  getStatus
};