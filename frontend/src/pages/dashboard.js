import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../components/Layout';
import DashboardLayout from '../components/Layout';
import { aiAPI, tasksAPI, eventsAPI } from '../services/api';
import { 
  CheckSquare, Calendar, FileText, TrendingUp, 
  Clock, Zap, AlertCircle, ChevronRight, Activity,
  Plus, ArrowUpRight, Target, CalendarCheck,
  MessageCircle, Lightbulb, Bot, Cpu, Sparkles,
  ArrowUp, Flame
} from 'lucide-react';
import { format } from 'date-fns';

/* Animated count-up hook — Optimized for speed */
function useCountUp(target, duration = 600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return val;
}

/* Stat Card with animated number */
function StatCard({ icon: Icon, label, value, color, trend, delay = 0 }) {
  const count = useCountUp(Number(value) || 0);
  return (
    <div
      className="glass stat-card card-enter"
      style={{ '--stat-color': `${color}22`, animationDelay: `${delay}s` }}
    >
      <div className="stat-icon" style={{ background: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="stat-info">
        <h3>{count}{typeof value === 'string' && value.includes('%') ? '%' : ''}</h3>
        <p>{label}</p>
        {trend !== undefined && (
          <div className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
            <ArrowUp size={10} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
            {Math.abs(trend)}% this week
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user }    = useAuth();
  const router      = useRouter();
  const [analytics, setAnalytics]   = useState(null);
  const [tasks, setTasks]           = useState([]);
  const [events, setEvents]         = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();
    const tick = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);

  const loadData = async () => {
    try {
      const [analyticsRes, tasksRes, eventsRes, suggestionsRes] = await Promise.all([
        aiAPI.getAnalytics('week').catch(() => ({ data: {} })),
        tasksAPI.getAll({ status: 'pending' }).catch(() => ({ data: [] })),
        eventsAPI.getAll({}).catch(() => ({ data: [] })),
        aiAPI.getSuggestions().catch(() => ({ data: [] }))
      ]);
      setAnalytics(analyticsRes.data || {});
      setTasks(tasksRes.data?.slice(0, 5) || []);
      setEvents(eventsRes.data?.slice(0, 3) || []);
      setSuggestions(suggestionsRes.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 5)  return ['Good night', '🌙'];
    if (h < 12) return ['Good morning', '☀️'];
    if (h < 18) return ['Good afternoon', '⚡'];
    return ['Good evening', '🌆'];
  };
  const [greeting, emoji] = getGreeting();

  const quickActions = [
    { icon: Plus,          label: 'Add Task',  color: '#6366f1', href: '/tasks?new=true',    bg: 'rgba(99,102,241,.12)' },
    { icon: Calendar,      label: 'Add Event', color: '#22c55e', href: '/calendar?new=true',  bg: 'rgba(34,197,94,.12)' },
    { icon: FileText,      label: 'New Note',  color: '#f59e0b', href: '/notes?new=true',     bg: 'rgba(245,158,11,.12)' },
    { icon: MessageCircle, label: 'Chat AI',   color: '#8b5cf6', href: '/chat',               bg: 'rgba(139,92,246,.12)' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <div style={{
          width: '60px', height: '60px',
          background: 'var(--accent-gradient)',
          borderRadius: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'logo-pulse 1.5s ease-in-out infinite'
        }}>
          <Cpu size={26} color="white" />
        </div>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading your dashboard…</p>
        <style jsx>{`
          @keyframes logo-pulse {
            0%,100% { box-shadow: 0 0 16px rgba(99,102,241,.4); }
            50%      { box-shadow: 0 0 32px rgba(139,92,246,.7); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Header */}
      <div className="header">
        <div style={{ animation: 'fadeSlideDown .6s var(--ease-smooth) both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }}>{emoji}</span>
            <h1 style={{ margin: 0 }}>{greeting}, {user?.name || user?.username}!</h1>
          </div>
          <p className="header-subtitle">
            {format(currentTime, 'EEEE, MMMM d · h:mm a')}
          </p>
        </div>
        <div className="header-right">
          <div className="ai-status">
            <div className="ai-status-dot" />
            <Zap size={13} fill="currentColor" />
            <span>AI BRAIN ACTIVE</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData} style={{ borderRadius: 'var(--radius-full)', padding: '10px 18px' }}>
            <Activity size={14} />
            Sync Dashboard
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        {quickActions.map((action, i) => (
          <div 
            key={i} 
            className="quick-action-card"
            style={{ animationDelay: `${0.1 + (i * 0.05)}s` }}
            onClick={() => router.push(action.href)}
          >
            <div className="quick-action-icon" style={{ background: action.bg, color: action.color }}>
              <action.icon size={22} strokeWidth={2.5} />
            </div>
            <div className="quick-action-info">
              <span className="quick-action-text">{action.label}</span>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Quick shortcut</p>
            </div>
            <ArrowUpRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto', opacity: 0.5 }} />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={CheckSquare} label="Pending Tasks"     value={analytics?.tasks?.pending    || 0} color="#6366f1" trend={5}  delay={0.0} />
        <StatCard icon={TrendingUp}  label="Completed / Week"  value={analytics?.tasks?.completed  || 0} color="#22c55e" trend={12} delay={0.04} />
        <StatCard icon={Calendar}    label="Upcoming Events"   value={analytics?.events || events.length || 0} color="#f59e0b" trend={3} delay={0.08} />
        <StatCard icon={Activity}    label="Productivity"      value={`${analytics?.productivityScore || 0}`}  color="#8b5cf6" trend={8} delay={0.12} />
      </div>

      {/* 3-column section */}
      <div className="grid-3">
        {/* Priority Tasks */}
        <div className="glass card card-enter" style={{ animationDelay: '.1s' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
              <h3 className="card-title">Priority Tasks</h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/tasks')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="task-list">
            {tasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                <div className="empty-state-icon"><Target size={24} /></div>
                <p className="empty-state-title" style={{ fontSize: '15px' }}>No pending tasks</p>
                <p className="empty-state-text">Create a task to get started</p>
              </div>
            ) : (
              tasks.map((task, i) => (
                <div key={task._id} className="task-item" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="task-checkbox" />
                  <div className="task-content">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                      {task.dueDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} />
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="glass card card-enter" style={{ animationDelay: '.17s' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <h3 className="card-title">Upcoming Events</h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/calendar')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                <div className="empty-state-icon"><CalendarCheck size={24} /></div>
                <p className="empty-state-title" style={{ fontSize: '15px' }}>No upcoming events</p>
                <p className="empty-state-text">Schedule an event</p>
              </div>
            ) : (
              events.map((event, i) => (
                <div key={event._id} className="task-item" style={{ animationDelay: `${i * 0.06}s` }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: `${event.color || '#6366f1'}22`,
                    border: `1px solid ${event.color || '#6366f1'}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: event.color || '#6366f1' }} />
                  </div>
                  <div className="task-content">
                    <div className="task-title">{event.title}</div>
                    <div className="task-meta">
                      <Clock size={11} />
                      {format(new Date(event.startTime), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass card card-enter" style={{ animationDelay: '.24s', position: 'relative', overflow: 'hidden' }}>
          {/* Glow orb */}
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '100px', height: '100px',
            background: 'radial-gradient(circle, rgba(139,92,246,.2) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none'
          }} />
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6', animation: 'status-pulse 2s ease-in-out infinite' }} />
              <h3 className="card-title">AI Insights</h3>
            </div>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Lightbulb size={14} style={{ color: '#a78bfa' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {suggestions.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                <div className="empty-state-icon"><Bot size={24} /></div>
                <p className="empty-state-title" style={{ fontSize: '15px' }}>No insights yet</p>
                <p className="empty-state-text">Chat with JARVIS for personalized suggestions</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '14px' }} onClick={() => router.push('/chat')}>
                  <Sparkles size={14} /> Ask JARVIS
                </button>
              </div>
            ) : (
              suggestions.map((s, i) => (
                <div key={i} className="glass" style={{ padding: '14px', display: 'flex', gap: '12px', animationDelay: `${i * 0.08}s` }}>
                  <Lightbulb size={16} style={{ color: '#a78bfa', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', marginBottom: '3px' }}>
                      {s.message || s.title}
                    </div>
                    {s.items?.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {s.items.length} related items
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Overdue alert */}
      {analytics?.tasks?.overdue > 0 && (
        <div className="glass" style={{
          marginTop: '22px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '14px',
          border: '1px solid rgba(239,68,68,.3)',
          background: 'rgba(239,68,68,.06)',
          animation: 'fadeSlideUp .4s ease both'
        }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={18} style={{ color: 'var(--error)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--error)' }}>
              {analytics.tasks.overdue} overdue task{analytics.tasks.overdue > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Review and reschedule to stay productive</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => router.push('/tasks')}>
            View Tasks <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </AuthProvider>
  );
}