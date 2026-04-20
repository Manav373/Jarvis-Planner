const toolRegistry = require('../mcp/tools');
const longTermMemory = require('../memory/longTerm');

class NotesAgent {
  constructor() {
    this.name = 'NotesAgent';
  }

  async execute(userId, action, params) {
    const startTime = Date.now();
    
    try {
      let result;
      switch (action) {
        case 'get_notes':
          result = await toolRegistry.executeTool('get_notes', { userId, ...params });
          break;
        case 'create_note':
          result = await toolRegistry.executeTool('create_note', { userId, ...params });
          break;
        case 'update_note':
          result = await toolRegistry.executeTool('update_note', params);
          break;
        case 'search_notes':
          result = await this.searchNotes(userId, params);
          break;
        case 'summarize':
          result = await this.summarizeNotes(userId, params);
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

  async searchNotes(userId, params) {
    const { query } = params;
    const Note = require('../models/Note');
    
    const notes = await Note.find({
      userId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ]
    });

    return notes;
  }

  async summarizeNotes(userId, params) {
    const { category, limit = 10 } = params;
    const notes = await toolRegistry.executeTool('get_notes', { userId, category });
    
    const summary = notes.slice(0, limit).map(note => ({
      title: note.title,
      preview: note.content ? note.content.substring(0, 100) + '...' : '',
      tags: note.tags,
      updatedAt: note.updatedAt
    }));

    return {
      totalNotes: notes.length,
      summary
    };
  }

  async archiveNote(noteId) {
    const Note = require('../models/Note');
    return await Note.findByIdAndUpdate(noteId, { isArchived: true }, { new: true });
  }

  async pinNote(noteId, isPinned = true) {
    const Note = require('../models/Note');
    return await Note.findByIdAndUpdate(noteId, { isPinned }, { new: true });
  }
}

module.exports = new NotesAgent();