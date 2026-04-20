class ShortTermMemory {
  constructor() {
    this.sessions = new Map();
  }

  createSession(userId) {
    const sessionId = `session_${userId}_${Date.now()}`;
    this.sessions.set(sessionId, {
      userId,
      messages: [],
      context: {},
      createdAt: new Date(),
      lastActivity: new Date()
    });
    return sessionId;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId, role, content) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push({ role, content, timestamp: new Date() });
      session.lastActivity = new Date();
    }
  }

  updateContext(sessionId, context) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.context = { ...session.context, ...context };
    }
  }

  getContext(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.context : {};
  }

  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  cleanup() {
    const now = new Date();
    const timeout = 30 * 60 * 1000;
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > timeout) {
        this.sessions.delete(id);
      }
    }
  }
}

module.exports = new ShortTermMemory();