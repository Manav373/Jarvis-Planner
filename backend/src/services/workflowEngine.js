const orchestrator = require('../agents/orchestrator');
const taskAgent = require('../agents/taskAgent');
const calendarAgent = require('../agents/calendarAgent');
const notesAgent = require('../agents/notesAgent');
const notificationAgent = require('../agents/notificationAgent');
const knowledgeAgent = require('../agents/knowledgeAgent');

const workflows = {
  'plan_day': {
    name: 'Plan My Day',
    description: 'Analyze tasks and events to create optimal daily schedule',
    steps: [
      { agent: 'task', action: 'get_tasks', params: { status: 'pending' } },
      { agent: 'calendar', action: 'get_events', params: {} },
      { agent: 'orchestrator', action: 'optimize_schedule', params: {} },
      { agent: 'notification', action: 'send', params: { type: 'schedule' } }
    ]
  },
  'plan_tomorrow': {
    name: 'Plan Tomorrow',
    description: 'Create schedule for tomorrow',
    steps: [
      { agent: 'task', action: 'get_tasks', params: { status: 'pending' } },
      { agent: 'calendar', action: 'get_events', params: { date: 'tomorrow' } },
      { agent: 'task', action: 'prioritize', params: {} },
      { agent: 'notification', action: 'schedule', params: { type: 'daily_summary', time: 'tomorrow morning' } }
    ]
  },
  'add_task_with_reminder': {
    name: 'Add Task with Reminder',
    description: 'Create task and set reminder',
    steps: [
      { agent: 'task', action: 'create_task', params: {} },
      { agent: 'notification', action: 'schedule', params: { type: 'task_reminder' } }
    ]
  },
  'weekly_review': {
    name: 'Weekly Review',
    description: 'Analyze week performance and plan next week',
    steps: [
      { agent: 'task', action: 'analyze', params: { period: 'week' } },
      { agent: 'calendar', action: 'get_events', params: { period: 'week' } },
      { agent: 'notes', action: 'summarize', params: {} },
      { agent: 'notification', action: 'send_daily_summary', params: {} }
    ]
  },
  'smart_schedule': {
    name: 'Smart Schedule',
    description: 'Find optimal time and schedule task',
    steps: [
      { agent: 'calendar', action: 'find_free_time', params: {} },
      { agent: 'task', action: 'create_task', params: {} },
      { agent: 'calendar', action: 'create_event', params: {} }
    ]
  }
};

class WorkflowEngine {
  constructor() {
    this.workflows = workflows;
    this.activeWorkflows = new Map();
  }

  registerWorkflow(name, workflow) {
    this.workflows[name] = workflow;
  }

  getWorkflows() {
    return Object.keys(this.workflows).map(key => ({
      name: key,
      ...this.workflows[key]
    }));
  }

  async execute(userId, workflowName, params = {}) {
    const workflow = this.workflows[workflowName];
    if (!workflow) {
      throw new Error(`Workflow ${workflowName} not found`);
    }

    const workflowId = `wf_${userId}_${Date.now()}`;
    this.activeWorkflows.set(workflowId, {
      name: workflowName,
      userId,
      status: 'running',
      startedAt: new Date(),
      steps: []
    });

    const results = [];
    let context = { userId, ...params };

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      
      try {
        const agent = this.getAgent(step.agent);
        const stepParams = { ...step.params, ...context };
        
        const result = await agent.execute(userId, step.action, stepParams);
        
        this.activeWorkflows.get(workflowId).steps.push({
          step: i + 1,
          agent: step.agent,
          action: step.action,
          status: 'success',
          result
        });

        results.push({ step: i + 1, ...result });
        context = { ...context, ...result };

      } catch (error) {
        this.activeWorkflows.get(workflowId).steps.push({
          step: i + 1,
          agent: step.agent,
          action: step.action,
          status: 'error',
          error: error.message
        });
        
        this.activeWorkflows.get(workflowId).status = 'failed';
        throw error;
      }
    }

    this.activeWorkflows.get(workflowId).status = 'completed';
    this.activeWorkflows.get(workflowId).completedAt = new Date();

    return {
      workflowId,
      workflowName: workflow.name,
      status: 'completed',
      steps: results,
      totalSteps: workflow.steps.length,
      context
    };
  }

  getAgent(agentName) {
    const agents = {
      orchestrator,
      task: taskAgent,
      calendar: calendarAgent,
      notes: notesAgent,
      notification: notificationAgent,
      knowledge: knowledgeAgent
    };
    return agents[agentName];
  }

  getActiveWorkflows(userId) {
    return Array.from(this.activeWorkflows.values()).filter(
      wf => wf.userId === userId && wf.status === 'running'
    );
  }

  getWorkflowStatus(workflowId) {
    return this.activeWorkflows.get(workflowId);
  }
}

module.exports = new WorkflowEngine();