class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.executionHistory = [];
  }

  register(name, tool) {
    this.tools.set(name, tool);
    console.log(`[ToolRegistry] Registered tool: ${name}`);
  }

  unregister(name) {
    this.tools.delete(name);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getAllTools() {
    const tools = [];
    for (const [name, tool] of this.tools) {
      tools.push({
        name,
        description: tool.description,
        parameters: tool.parameters
      });
    }
    return tools;
  }

  async executeTool(name, params) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    const startTime = Date.now();
    try {
      const result = await tool.handler(params);
      this.executionHistory.push({
        tool: name,
        params,
        result,
        executionTime: Date.now() - startTime,
        success: true,
        timestamp: new Date()
      });
      return result;
    } catch (error) {
      this.executionHistory.push({
        tool: name,
        params,
        error: error.message,
        executionTime: Date.now() - startTime,
        success: false,
        timestamp: new Date()
      });
      throw error;
    }
  }

  async executeTools(toolCalls) {
    const results = [];
    for (const call of toolCalls) {
      const result = await this.executeTool(call.name, call.params);
      results.push({ name: call.name, result });
    }
    return results;
  }

  getExecutionHistory(limit = 20) {
    return this.executionHistory.slice(-limit);
  }

  suggestTools(context) {
    const suggestions = [];
    for (const [name, tool] of this.tools) {
      if (context.intent && name.includes(context.intent.toLowerCase())) {
        suggestions.push(name);
      }
    }
    return suggestions;
  }
}

module.exports = { ToolRegistry };