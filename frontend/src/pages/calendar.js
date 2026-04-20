import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../components/Layout';
import DashboardLayout from '../components/Layout';
import { eventsAPI } from '../services/api';
import { Plus, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, Users } from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths,
  isWithinInterval, parseISO
} from 'date-fns';

function CalendarContent() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    startTime: '', 
    endTime: '', 
    eventType: 'meeting', 
    location: '',
    color: '#6366f1'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    
    if (router.query?.new === 'true') {
      setShowModal(true);
    }
  }, [currentDate]);

  useEffect(() => {
    if (router.query?.new === 'true') {
      setShowModal(true);
      router.replace('/calendar', undefined, { shallow: true });
    }
  }, [router.query]);

  const loadEvents = async () => {
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      const res = await eventsAPI.getAll({ startDate: start, endDate: end });
      setEvents(res.data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        startTime: new Date(`${selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd')}T${formData.startTime}`),
        endTime: new Date(`${selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd')}T${formData.endTime}`)
      };
      
      await eventsAPI.create(data);
      setShowModal(false);
      setFormData({ title: '', description: '', startTime: '', endTime: '', eventType: 'meeting', location: '', color: '#6366f1' });
      setSelectedDate(null);
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const deleteEvent = async (id) => {
    if (confirm('Delete this event?')) {
      await eventsAPI.delete(id);
      loadEvents();
    }
  };

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, day);
    });
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const currentDay = day;
      const dayEvents = getEventsForDay(day);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      days.push(
        <div
          key={day.toString()}
          className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-event' : ''}`}
          onClick={() => {
            setSelectedDate(currentDay);
            setShowModal(true);
          }}
        >
          <span style={{ fontWeight: isToday ? 600 : 400 }}>{format(day, 'd')}</span>
          {dayEvents.length > 0 && (
            <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
              {dayEvents.slice(0, 3).map((event, i) => (
                <div 
                  key={i} 
                  style={{ 
                    width: '5px', 
                    height: '5px', 
                    borderRadius: '50%', 
                    background: event.color || 'var(--accent-primary)' 
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      );
      day = addDays(day, 1);
    }

    return days;
  };

  const eventTypes = [
    { value: 'meeting', label: 'Meeting', color: '#6366f1' },
    { value: 'reminder', label: 'Reminder', color: '#f59e0b' },
    { value: 'deadline', label: 'Deadline', color: '#ef4444' },
    { value: 'personal', label: 'Personal', color: '#22c55e' },
    { value: 'work', label: 'Work', color: '#8b5cf6' },
    { value: 'other', label: 'Other', color: '#71717a' }
  ];

  const selectedEventType = eventTypes.find(t => t.value === formData.eventType);

  return (
    <div className="main-content">
      <div className="header">
        <div>
          <h1>Calendar</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {events.length} events this month
          </p>
        </div>
        <div className="header-right">
          <div className="glass" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
            <button 
              className={`btn ${view === 'month' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setView('month')}
              style={{ padding: '8px 14px' }}
            >
              Month
            </button>
            <button 
              className={`btn ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setView('list')}
              style={{ padding: '8px 14px' }}
            >
              List
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add Event
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : view === 'month' ? (
        <div className="glass card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '22px', fontWeight: 600 }}>{format(currentDate, 'MMMM yyyy')}</h2>
            <button className="btn btn-secondary" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ textAlign: 'center', padding: '12px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {renderCalendar()}
          </div>
        </div>
      ) : (
        <div className="glass card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {events.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <CalendarIcon size={32} />
                </div>
                <p className="empty-state-title">No events this month</p>
                <p className="empty-state-text">Schedule an event to stay organized</p>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>
                  <Plus size={18} /> Add Event
                </button>
              </div>
            ) : (
              events
                .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                .map(event => (
                  <div 
                    key={event._id} 
                    className="task-item glass-hover"
                    style={{ 
                      borderLeft: `4px solid ${event.color || 'var(--accent-primary)'}`,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedEvent(event);
                      setFormData({
                        title: event.title,
                        description: event.description || '',
                        startTime: format(new Date(event.startTime), 'HH:mm'),
                        endTime: format(new Date(event.endTime), 'HH:mm'),
                        eventType: event.eventType || 'other',
                        location: event.location || '',
                        color: event.color || '#6366f1'
                      });
                      setShowModal(true);
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: '6px' }}>{event.title}</div>
                      <div className="task-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} />
                          {format(new Date(event.startTime), 'MMM d, h:mm a')}
                        </span>
                        {event.location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={14} />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '8px', color: 'var(--error)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEvent(event._id);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => { setShowModal(false); setSelectedEvent(null); }}>
          <div className="glass modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedEvent ? 'Edit Event' : 'Add Event'}</h3>
              <button 
                className="modal-close" 
                onClick={() => { setShowModal(false); setSelectedEvent(null); }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Event title"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="textarea"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event description"
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    className="input"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    className="input"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="select"
                    value={formData.eventType}
                    onChange={e => {
                      const type = eventTypes.find(t => t.value === e.target.value);
                      setFormData({ 
                        ...formData, 
                        eventType: e.target.value,
                        color: type?.color || '#6366f1'
                      });
                    }}
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Location"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Calendar() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <CalendarContent />
      </DashboardLayout>
    </AuthProvider>
  );
}