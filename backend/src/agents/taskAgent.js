const toolRegistry = require('../mcp/tools');
const longTermMemory = require('../memory/longTerm');

class TaskAgent {
  constructor() {
    this.name = 'TaskAgent';
  }

  async execute(userId, action, params) {
    const startTime = Date.now();
    
    try {
      let result;
      switch (action) {
        case 'get_tasks':
          result = await toolRegistry.executeTool('get_tasks', { userId, ...params });
          break;
        case 'create_task':
          result = await toolRegistry.executeTool('create_task', { userId, ...params });
          break;
        case 'update_task':
          result = await toolRegistry.executeTool('update_task', params);
          break;
        case 'delete_task':
          result = await toolRegistry.executeTool('delete_task', params);
          break;
        case 'prioritize':
          result = await this.prioritizeTasks(userId, params);
          break;
        case 'analyze':
          result = await this.analyzeTasks(userId, params);
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

  async prioritizeTasks(userId, params) {
    const tasks = await toolRegistry.executeTool('get_tasks', { userId, status: 'pending' });
    
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const sorted = tasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    });

    for (let i = 0; i < sorted.length; i++) {
      await toolRegistry.executeTool('update_task', {
        taskId: sorted[i]._id,
        updates: { priority: sorted[i].priority }
      });
    }

    return {
      prioritized: sorted.map((t, i) => ({ rank: i + 1, title: t.title, priority: t.priority }))
    };
  }

  async analyzeTasks(userId, params) {
    const tasks = await toolRegistry.executeTool('get_tasks', { userId });
    
    const analysis = {
      total: tasks.length,
      byStatus: {},
      byPriority: {},
      overdue: 0,
      dueToday: 0,
      suggestions: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    tasks.forEach(task => {
      analysis.byStatus[task.status] = (analysis.byStatus[task.status] || 0) + 1;
      analysis.byPriority[task.priority] = (analysis.byPriority[task.priority] || 0) + 1;

      if (task.dueDate && new Date(task.dueDate) < now && task.status === 'pending') {
        analysis.overdue++;
      }
      if (task.dueDate && new Date(task.dueDate).toDateString() === today.toDateString()) {
        analysis.dueToday++;
      }
    });

    if (analysis.overdue > 0) {
      analysis.suggestions.push(`You have ${analysis.overdue} overdue tasks. Consider rescheduling.`);
    }
    if (analysis.dueToday > 3) {
      analysis.suggestions.push(`You have ${analysis.dueToday} tasks due today. Prioritize accordingly.`);
    }

    return analysis;
  }

  async getSubtasks(taskId) {
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);
    return task ? task.subtasks : [];
  }

  async addSubtask(taskId, subtaskTitle) {
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);
    if (task) {
      task.subtasks.push({ title: subtaskTitle, completed: false });
      return await task.save();
    }
    return null;
  }

  async completeSubtask(taskId, subtaskIndex) {
    const Task = require('../models/Task');
    const task = await Task.findById(taskId);
    if (task && task.subtasks[subtaskIndex]) {
      task.subtasks[subtaskIndex].completed = true;
      return await task.save();
    }
    return null;
  }
}

module.exports = new TaskAgent();