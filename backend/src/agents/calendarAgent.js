const toolRegistry = require('../mcp/tools');
const longTermMemory = require('../memory/longTerm');

class CalendarAgent {
  constructor() {
    this.name = 'CalendarAgent';
  }

  async execute(userId, action, params) {
    const startTime = Date.now();
    
    try {
      let result;
      switch (action) {
        case 'get_events':
          result = await toolRegistry.executeTool('get_events', { userId, ...params });
          break;
        case 'create_event':
          result = await toolRegistry.executeTool('create_event', { userId, ...params });
          break;
        case 'update_event':
          result = await this.updateEvent(params);
          break;
        case 'delete_event':
          result = await this.deleteEvent(params);
          break;
        case 'find_free_time':
          result = await this.findFreeTime(userId, params);
          break;
        case 'detect_conflicts':
          result = await this.detectConflicts(userId, params);
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

  async updateEvent(params) {
    const Event = require('../models/Event');
    return await Event.findByIdAndUpdate(params.eventId, params.updates, { new: true });
  }

  async deleteEvent(params) {
    const Event = require('../models/Event');
    return await Event.findByIdAndDelete(params.eventId);
  }

  async findFreeTime(userId, params) {
    const { date, startHour = 9, endHour = 18 } = params;
    const events = await toolRegistry.executeTool('get_events', { 
      userId, 
      startDate: date, 
      endDate: date 
    });

    const freeSlots = [];
    let currentHour = startHour;

    const sortedEvents = events.sort((a, b) => 
      new Date(a.startTime) - new Date(b.startTime)
    );

    for (const event of sortedEvents) {
      const eventStart = new Date(event.startTime).getHours();
      if (eventStart > currentHour) {
        freeSlots.push({ start: currentHour, end: eventStart });
      }
      const eventEnd = new Date(event.endTime).getHours();
      currentHour = Math.max(currentHour, eventEnd);
    }

    if (currentHour < endHour) {
      freeSlots.push({ start: currentHour, end: endHour });
    }

    return {
      date,
      freeSlots: freeSlots.map(slot => ({
        start: `${slot.start}:00`,
        end: `${slot.end}:00`
      }))
    };
  }

  async detectConflicts(userId, params) {
    const { startTime, endTime } = params;
    const events = await toolRegistry.executeTool('get_events', { 
      userId,
      startDate: startTime,
      endDate: endTime
    });

    const conflicts = [];
    const newStart = new Date(startTime).getTime();
    const newEnd = new Date(endTime).getTime();

    for (const event of events) {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();

      if (newStart < eventEnd && newEnd > eventStart) {
        conflicts.push({
          event: event.title,
          startTime: event.startTime,
          endTime: event.endTime
        });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  async suggestOptimalTime(userId, durationMinutes) {
    const today = new Date().toISOString().split('T')[0];
    const freeTime = await this.findFreeTime(userId, { date: today });
    
    const durationHours = durationMinutes / 60;
    const suitableSlots = freeTime.freeSlots.filter(slot => {
      const start = parseInt(slot.start.split(':')[0]);
      const end = parseInt(slot.end.split(':')[0]);
      return (end - start) >= durationHours;
    });

    return {
      recommendedTime: suitableSlots[0]?.start || 'No suitable time found',
      alternativeTimes: suitableSlots.map(s => s.start)
    };
  }
}

module.exports = new CalendarAgent();