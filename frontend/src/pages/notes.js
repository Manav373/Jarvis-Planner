import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../components/Layout';
import DashboardLayout from '../components/Layout';
import { notesAPI } from '../services/api';
import { Plus, X, Pin, Archive, Trash2, Edit2, Search, FileText, Tag, Folder, Clock, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

function NotesContent() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    category: 'general', 
    tags: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
    
    if (router.query?.new === 'true') {
      setShowModal(true);
    }
  }, [filter]);

  useEffect(() => {
    if (router.query?.new === 'true') {
      setShowModal(true);
      router.replace('/notes', undefined, { shallow: true });
    }
  }, [router.query]);

  const loadNotes = async () => {
    try {
      const params = {};
      if (filter === 'pinned') params.tag = 'pinned';
      if (filter === 'archived') params.archived = 'true';
      const res = await notesAPI.getAll(params);
      setNotes(res.data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      
      if (editingNote) {
        await notesAPI.update(editingNote._id, data);
      } else {
        await notesAPI.create(data);
      }
      setShowModal(false);
      setEditingNote(null);
      setFormData({ title: '', content: '', category: 'general', tags: '' });
      loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const togglePin = async (note) => {
    await notesAPI.pin(note._id);
    loadNotes();
  };

  const toggleArchive = async (note) => {
    await notesAPI.archive(note._id);
    loadNotes();
  };

  const deleteNote = async (id) => {
    if (confirm('Delete this note?')) {
      await notesAPI.delete(id);
      loadNotes();
    }
  };

  const openEdit = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content || '',
      category: note.category || 'general',
      tags: note.tags ? note.tags.join(', ') : ''
    });
    setShowModal(true);
  };

  const filteredNotes = useMemo(() => {
    let filtered = notes;
    if (searchQuery) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [notes, searchQuery]);

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

  const categories = [
    { value: 'general', label: 'General', icon: FileText },
    { value: 'work', label: 'Work', icon: Folder },
    { value: 'personal', label: 'Personal', icon: FileText },
    { value: 'ideas', label: 'Ideas', icon: Tag },
    { value: 'learning', label: 'Learning', icon: FileText },
  ];

  return (
    <div className="main-content">
      <div className="header">
        <div>
          <h1>Notes</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {notes.length} notes total
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Note
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        {[
          { value: 'all', label: 'All', count: notes.length },
          { value: 'pinned', label: 'Pinned', count: notes.filter(n => n.isPinned).length },
          { value: 'archived', label: 'Archived', count: notes.filter(n => n.isArchived).length },
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
      ) : filteredNotes.length === 0 ? (
        <div className="glass card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={32} />
            </div>
            <p className="empty-state-title">No notes found</p>
            <p className="empty-state-text">Create a note to get started</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>
              <Plus size={18} /> Add Note
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {pinnedNotes.length > 0 && (
            <>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Pin size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pinned</span>
              </div>
              {pinnedNotes.map(note => (
                <div key={note._id} className="note-card glass-hover">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 className="note-title" style={{ flex: 1, fontSize: '17px' }}>{note.title}</h3>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="btn btn-ghost" 
                        style={{ 
                          padding: '6px', 
                          background: note.isPinned ? 'var(--accent-primary)' : 'transparent',
                          color: note.isPinned ? 'white' : 'var(--text-muted)'
                        }}
                        onClick={() => togglePin(note)}
                      >
                        <Pin size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="note-preview">{note.content || 'No content'}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map((tag, i) => (
                        <span key={i} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} />
                      {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => openEdit(note)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--error)' }} onClick={() => deleteNote(note._id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {unpinnedNotes.length > 0 && (
            <>
              {pinnedNotes.length > 0 && (
                <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Other Notes</span>
                </div>
              )}
              {unpinnedNotes.map(note => (
                <div key={note._id} className="note-card glass-hover">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h3 className="note-title" style={{ flex: 1, fontSize: '17px' }}>{note.title}</h3>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        className="btn btn-ghost" 
                        style={{ 
                          padding: '6px', 
                          background: note.isPinned ? 'var(--accent-primary)' : 'transparent',
                          color: note.isPinned ? 'white' : 'var(--text-muted)'
                        }}
                        onClick={() => togglePin(note)}
                      >
                        <Pin size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="note-preview">{note.content || 'No content'}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map((tag, i) => (
                        <span key={i} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} />
                      {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => openEdit(note)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--error)' }} onClick={() => deleteNote(note._id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => { setShowModal(false); setEditingNote(null); }}>
          <div className="glass modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingNote ? 'Edit Note' : 'Add New Note'}</h3>
              <button 
                className="modal-close" 
                onClick={() => { setShowModal(false); setEditingNote(null); }}
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
                  placeholder="Note title"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  className="textarea"
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your note..."
                  rows="8"
                  style={{ minHeight: '200px' }}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="select"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="work, important, ideas"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingNote ? 'Update Note' : 'Create Note'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Notes() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <NotesContent />
      </DashboardLayout>
    </AuthProvider>
  );
}