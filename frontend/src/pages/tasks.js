import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../components/Layout';
import DashboardLayout from '../components/Layout';
import { tasksAPI } from '../services/api';
import { Plus, Check, Clock, Trash2, Edit2, X, MoreVertical, GripVertical, Filter, Search, LayoutGrid, List, Calendar } from 'lucide-react';
import { format } from 'date-fns';

function TasksContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    dueDate: '', 
    category: 'general',
    status: 'pending'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    
    if (router.query?.new === 'true') {
      setShowModal(true);
    }
  }, [filter]);

  useEffect(() => {
    if (router.query?.new === 'true') {
      setShowModal(true);
      router.replace('/tasks', undefined, { shallow: true });
    }
  }, [router.query]);

  const loadTasks = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await tasksAPI.getAll(params);
      setTasks(res.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
      };
      
      if (editingTask) {
        await tasksAPI.update(editingTask._id, data);
      } else {
        await tasksAPI.create(data);
      }
      setShowModal(false);
      setEditingTask(null);
      setFormData({ title: '', description: '', priority: 'medium', dueDate: '', category: 'general', status: 'pending' });
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const toggleComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await tasksAPI.update(task._id, { status: newStatus });
    loadTasks();
  };

  const deleteTask = async (id) => {
    if (confirm('Delete this task?')) {
      await tasksAPI.delete(id);
      loadTasks();
    }
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      category: task.category || 'general',
      status: task.status || 'pending'
    });
    setShowModal(true);
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (filter !== 'all') {
      filtered = tasks.filter(t => t.status === filter);
    }
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [tasks, filter, searchQuery]);

  const groupedTasks = useMemo(() => {
    return {
      pending: filteredTasks.filter(t => t.status === 'pending'),
      in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
      completed: filteredTasks.filter(t => t.status === 'completed'),
    };
  }, [filteredTasks]);

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'work', label: 'Work' },
    { value: 'personal', label: 'Personal' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'health', label: 'Health' },
    { value: 'learning', label: 'Learning' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: '#22c55e' },
    { value: 'medium', label: 'Medium', color: '#eab308' },
    { value: 'high', label: 'High', color: '#f97316' },
    { value: 'urgent', label: 'Urgent', color: '#dc2626' },
  ];

  return (
    <div className="main-content">
      <div className="header">
        <div>
          <h1>Tasks</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filteredTasks.length} tasks total
          </p>
        </div>
        <div className="header-right">
          <div className="glass" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
            <button 
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
              style={{ padding: '8px' }}
            >
              <List size={18} />
            </button>
            <button 
              className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('kanban')}
              style={{ padding: '8px' }}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add Task
          </button>
        </div>
      </div>

      <div className="search-bar">
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        {[
          { value: 'all', label: 'All', count: tasks.length },
          { value: 'pending', label: 'Pending', count: tasks.filter(t => t.status === 'pending').length },
          { value: 'in_progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
          { value: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'completed').length },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`filter-tab ${filter === f.value ? 'active' : ''}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="glass card" style={{ padding: '8px' }}>
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Check size={32} />
              </div>
              <p className="empty-state-title">No tasks found</p>
              <p className="empty-state-text">Create a task to get started</p>
              <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>
                <Plus size={18} /> Add Task
              </button>
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map(task => (
                <div 
                  key={task._id} 
                  className="task-item glass-hover"
                  style={{
                    opacity: task.status === 'completed' ? 0.6 : 1,
                  }}
                >
                  <GripVertical size={16} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                  <div 
                    className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                    onClick={() => toggleComplete(task)}
                  >
                    {task.status === 'completed' && <Check size={14} />}
                  </div>
                  <div className="task-content">
                    <div 
                      className="task-title"
                      style={{ 
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      }}
                    >
                      {task.title}
                    </div>
                    <div className="task-meta">
                      <span className={`priority-badge priority-${task.priority}`}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span>{task.category}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '8px' }} 
                      onClick={() => openEdit(task)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '8px', color: 'var(--error)' }} 
                      onClick={() => deleteTask(task._id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="kanban-board">
          {[
            { value: 'pending', label: 'To Do', color: '#6366f1' },
            { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
            { value: 'completed', label: 'Done', color: '#22c55e' },
          ].map(column => (
            <div key={column.value} className="kanban-column">
              <div className="glass card">
                <div className="kanban-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: column.color 
                    }} />
                    <span style={{ fontWeight: 600 }}>{column.label}</span>
                    <span className="kanban-count">{groupedTasks[column.value]?.length || 0}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {groupedTasks[column.value]?.map(task => (
                    <div 
                      key={task._id} 
                      className="glass"
                      style={{ 
                        padding: '16px', 
                        cursor: 'grab',
                        borderLeft: `3px solid ${column.color}`
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: '8px' }}>{task.title}</div>
                      <div className="task-meta">
                        <span className={`priority-badge priority-${task.priority}`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '6px' }} 
                          onClick={() => openEdit(task)}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => { setShowModal(false); setEditingTask(null); }}>
          <div className="glass modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
              <button 
                className="modal-close" 
                onClick={() => { setShowModal(false); setEditingTask(null); }}
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
                  placeholder="Task title"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="textarea"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description"
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="select"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="select"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {editingTask && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="select"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <TasksContent />
      </DashboardLayout>
    </AuthProvider>
  );
}