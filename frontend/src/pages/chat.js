import { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from '../components/Layout';
import DashboardLayout from '../components/Layout';
import { aiAPI } from '../services/api';
import {
  Send, Mic, MicOff, Volume2, VolumeX, Bot, User,
  Plus, Trash2, ChevronLeft, History, Sparkles,
  Activity, CheckSquare, FileText, Settings, Zap,
  Copy, ThumbsUp, RotateCcw, Search, X, Clock
} from 'lucide-react';

/* ── Typing indicator ──────────────────────────────────── */
function TypingDots() {
  return (
    <span className="_typing-dots">
      <span /><span /><span />
    </span>
  );
}

/* ── Animated bot orb (welcome screen) ─────────────────── */
function BotOrb() {
  return (
    <div className="_orb-wrap">
      <div className="_orb-ring _r1" />
      <div className="_orb-ring _r2" />
      <div className="_orb-ring _r3" />
      <div className="_orb-core">
        <Bot size={48} color="white" />
        <div className="_core-shine" />
      </div>
    </div>
  );
}

/* ── Message bubble ─────────────────────────────────────── */
function MessageBubble({ msg, index, user, onCopy, onSpeak }) {
  const isUser = msg.role === 'user';
  const initials = (user?.name || user?.username || 'U')[0].toUpperCase();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div
      className={`_msg-row ${isUser ? '_user-row' : '_ai-row'}`}
      style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
    >
      {/* Avatar */}
      <div className={`_msg-avatar ${isUser ? '_user-av' : '_ai-av'}`}>
        {isUser ? initials : <Bot size={18} color="white" />}
      </div>

      {/* Content */}
      <div className="_msg-content">
        <div className={`_msg-bubble ${isUser ? '_bubble-user' : '_bubble-ai'}`}>
          {msg.content}
        </div>

        {/* Action bar (AI only) */}
        {!isUser && (
          <div className="_msg-actions">
            <button className="_act-btn" onClick={handleCopy} title="Copy">
              <Copy size={12} />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button className="_act-btn" onClick={() => onSpeak?.(msg.content)} title="Speak">
              <Volume2 size={12} />
              <span>Read</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Voice waveform bars (while listening) ──────────────── */
function VoiceWave() {
  return (
    <div className="_voice-wave">
      {[1,2,3,4,5,6,7].map(i => (
        <div key={i} className="_wave-bar" style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

/* ── Suggestion chip ────────────────────────────────────── */
function SuggestionCard({ icon: Icon, title, desc, color, onClick, index }) {
  return (
    <button
      className="_sug-card"
      onClick={onClick}
      style={{ animationDelay: `${0.1 + index * 0.07}s` }}
    >
      <div className="_sug-icon" style={{ background: `${color}18`, color }}>
        <Icon size={20} />
      </div>
      <div className="_sug-text">
        <div className="_sug-title">{title}</div>
        <div className="_sug-desc">{desc}</div>
      </div>
      <div className="_sug-arrow">→</div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN CHAT COMPONENT
═══════════════════════════════════════════════════════════ */
function ChatContent() {
  const { user } = useAuth();
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [sessionId, setSessionId]     = useState(null);
  const [history, setHistory]         = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [inputRows, setInputRows]     = useState(1);

  const messagesEndRef  = useRef(null);
  const recognitionRef  = useRef(null);
  const synthesisRef    = useRef(null);
  const textareaRef     = useRef(null);

  /* init */
  useEffect(() => {
    synthesisRef.current = window.speechSynthesis;
    loadHistoryList();
    // close sidebar on mobile
    if (window.innerWidth < 1024) setSidebarOpen(false);
    return () => {
      recognitionRef.current?.stop();
      synthesisRef.current?.cancel();
    };
  }, []);

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* auto-grow textarea */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const sh = textareaRef.current.scrollHeight;
    textareaRef.current.style.height = Math.min(sh, 180) + 'px';
  }, [input]);

  /* ── API Calls ── */
  const loadHistoryList = async () => {
    try {
      const res = await aiAPI.getHistory(50);
      setHistory(res.data || []);
    } catch (e) { console.error(e); }
  };

  const loadConversation = async (id) => {
    if (sessionId === id) return;
    try {
      setLoading(true);
      const res = await aiAPI.getHistoryById(id);
      if (res.data) {
        setSessionId(res.data._id);
        setMessages(res.data.messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const startNewChat = () => {
    setMessages([]); setSessionId(null); setInput('');
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const deleteChat = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await aiAPI.deleteHistory(id);
      setHistory(p => p.filter(c => c._id !== id));
      if (sessionId === id) startNewChat();
    } catch (e) { console.error(e); }
  };

  const handleSend = useCallback(async (text = input) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await aiAPI.query(msg, sessionId);
      const reply = res.data?.response || 'Request processed successfully.';
      if (res.data?.sessionId && sessionId !== res.data.sessionId) {
        setSessionId(res.data.sessionId);
        loadHistoryList();
      }
      setMessages(p => [...p, { role: 'assistant', content: reply }]);
      if (user?.preferences?.voiceEnabled) speak(reply);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally { setLoading(false); }
  }, [input, loading, sessionId, user]);

  /* ── Voice ── */
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser.'); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-IN';
    r.onstart  = () => setIsListening(true);
    r.onresult = e => setInput(e.results[0][0].transcript);
    r.onerror  = () => setIsListening(false);
    r.onend    = () => { setIsListening(false); };
    recognitionRef.current = r;
    r.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const speak = (text) => {
    if (!synthesisRef.current) return;
    synthesisRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1;
    const voices = synthesisRef.current.getVoices();
    u.voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
           || voices.find(v => v.lang.startsWith('en')) || voices[0];
    u.onstart = () => setIsSpeaking(true);
    u.onend = u.onerror = () => setIsSpeaking(false);
    synthesisRef.current.speak(u);
  };

  const stopSpeaking = () => { synthesisRef.current?.cancel(); setIsSpeaking(false); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const suggestions = [
    { icon: Sparkles,    title: 'Plan my day',      desc: 'Create a priority-based schedule', color: '#8b5cf6' },
    { icon: CheckSquare, title: 'Manage my tasks',  desc: 'Review and organise pending tasks', color: '#3b82f6' },
    { icon: FileText,    title: 'Summarise notes',  desc: 'Digest my recent project notes',    color: '#ec4899' },
    { icon: Activity,    title: 'Productivity tips', desc: 'Analyse my efficiency patterns',   color: '#10b981' },
  ];

  const filteredHistory = history.filter(c =>
    (c.title || 'Untitled Chat').toLowerCase().includes(historySearch.toLowerCase())
  );

  /* ════ RENDER ════ */
  return (
    <div className="_chat-root">

      {/* ── HISTORY SIDEBAR ── */}
      <aside className={`_hist-sidebar ${sidebarOpen ? '_open' : ''}`}>
        {/* New chat */}
        <div className="_hist-top">
          <button className="_new-chat-btn" onClick={startNewChat}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="_hist-search">
          <Search size={14} className="_hist-search-icon" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
            className="_hist-search-input"
          />
          {historySearch && (
            <button className="_hist-search-clear" onClick={() => setHistorySearch('')}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Label */}
        <div className="_hist-label">
          <Clock size={11} /> Recent
        </div>

        {/* List */}
        <div className="_hist-list">
          {filteredHistory.length === 0 ? (
            <div className="_hist-empty">
              <History size={20} />
              <p>No conversations yet</p>
            </div>
          ) : filteredHistory.map((chat, i) => {
            const active = sessionId === chat._id;
            return (
              <div
                key={chat._id}
                className={`_hist-item ${active ? '_hist-active' : ''}`}
                onClick={() => loadConversation(chat._id)}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div className={`_hist-icon ${active ? '_hist-icon-active' : ''}`}>
                  <Bot size={14} />
                </div>
                <div className="_hist-item-text">{chat.title || 'Untitled Chat'}</div>
                <button
                  className="_hist-del"
                  onClick={e => deleteChat(e, chat._id)}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── MAIN PANEL ── */}
      <div className="_chat-main">

        {/* Topbar */}
        <header className="_chat-topbar">
          <div className="_topbar-left">
            <button
              className="_topbar-btn"
              onClick={() => setSidebarOpen(p => !p)}
              title={sidebarOpen ? 'Hide history' : 'Show history'}
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <History size={20} />}
            </button>
            <div className="_topbar-brand">
              <div className="_topbar-logo">
                <Zap size={16} color="white" />
              </div>
              <div>
                <div className="_topbar-title">
                  JARVIS
                  <span className="_topbar-badge">PRO</span>
                </div>
                <div className="_topbar-status">
                  <span className="_status-dot" />
                  {loading ? 'Thinking…' : isListening ? 'Listening…' : 'Online · Ready'}
                  {sessionId && <><span className="_status-sep">·</span>Session active</>}
                </div>
              </div>
            </div>
          </div>

          <div className="_topbar-right">
            {/* Voice btn */}
            <button
              className={`_topbar-tool ${isListening ? '_tool-active' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              <span className="_tool-label">
                {isListening ? 'Stop' : 'Voice'}
              </span>
              {isListening && <VoiceWave />}
            </button>

            {/* Speak btn */}
            <button
              className={`_topbar-tool ${isSpeaking ? '_tool-active' : ''}`}
              onClick={isSpeaking ? stopSpeaking : () => messages.length && speak(messages[messages.length - 1].content)}
              disabled={!messages.length}
              title={isSpeaking ? 'Stop speaking' : 'Read last message'}
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span className="_tool-label">{isSpeaking ? 'Stop' : 'Speak'}</span>
            </button>

            {/* New chat shortcut */}
            <button
              className="_topbar-tool"
              onClick={startNewChat}
              title="New chat"
            >
              <Plus size={16} />
              <span className="_tool-label">New</span>
            </button>
          </div>
        </header>

        {/* Messages area */}
        <div className="_messages-area">
          {messages.length === 0 ? (
            /* ── WELCOME SCREEN ── */
            <div className="_welcome">
              <BotOrb />

              <h1 className="_welcome-h1">
                How can I help you
                <span className="_welcome-gradient"> today?</span>
              </h1>
              <p className="_welcome-sub">
                I'm JARVIS — your intelligent AI companion for tasks, calendar, notes, and more.
              </p>

              <div className="_sug-grid">
                {suggestions.map((s, i) => (
                  <SuggestionCard
                    key={i}
                    {...s}
                    index={i}
                    onClick={() => handleSend(s.title)}
                  />
                ))}
              </div>

              <p className="_welcome-hint">
                <Sparkles size={12} /> Try a suggestion above or type anything below
              </p>
            </div>
          ) : (
            /* ── MESSAGES ── */
            <div className="_messages-inner">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  msg={msg}
                  index={i}
                  user={user}
                  onSpeak={speak}
                />
              ))}

              {/* Thinking indicator */}
              {loading && (
                <div className="_msg-row _ai-row">
                  <div className="_msg-avatar _ai-av _thinking-av">
                    <Bot size={18} color="white" />
                  </div>
                  <div className="_msg-content">
                    <div className="_msg-bubble _bubble-ai _thinking-bubble">
                      <TypingDots />
                      <span className="_thinking-text">Processing…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT BOX ── */}
        <div className="_input-zone">
          <div className={`_input-box ${isListening ? '_box-listening' : ''} ${input.trim() ? '_box-filled' : ''}`}>

            {/* Mic button (left) */}
            <button
              className={`_input-mic ${isListening ? '_mic-on' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title="Voice input"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              className="_input-textarea"
              placeholder={isListening ? '🎙 Listening…' : 'Message JARVIS…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isListening}
            />

            {/* Send button */}
            <button
              className={`_send-btn ${input.trim() && !loading ? '_send-active' : ''}`}
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              title="Send"
            >
              {loading
                ? <div className="_send-spinner" />
                : <Send size={17} />
              }
            </button>
          </div>

          <p className="_input-hint">
            JARVIS may be inaccurate. Verify important information. &nbsp;·&nbsp; <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>

      {/* ══ ALL STYLES ══════════════════════════════════════════ */}
      <style jsx global>{`
        /* Lock body scroll on chat page */
        body, html {
          overflow: hidden !important;
          height: 100% !important;
        }
        .main-wrapper {
          height: 100vh !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }

        /* ── Root layout ─────────────────────────────────────── */
        ._chat-root {
          display: flex;
          height: 100vh;
          overflow: hidden;
          position: relative;
          background: var(--bg-primary);
        }

        /* ── History sidebar ─────────────────────────────────── */
        ._hist-sidebar {
          width: 0;
          min-width: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: width .35s cubic-bezier(.16,1,.3,1), min-width .35s cubic-bezier(.16,1,.3,1);
          background: linear-gradient(180deg, rgba(10,10,20,.97) 0%, rgba(5,5,13,.98) 100%);
          border-right: 1px solid transparent;
          z-index: 20;
          flex-shrink: 0;
        }
        ._hist-sidebar._open {
          width: 300px;
          min-width: 300px;
          border-right-color: var(--glass-border);
          box-shadow: 8px 0 32px rgba(0,0,0,.4);
        }

        ._hist-top {
          padding: 20px 16px 12px;
          flex-shrink: 0;
        }
        ._new-chat-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px 20px;
          border-radius: 14px;
          border: 1px solid rgba(99,102,241,.3);
          background: linear-gradient(135deg, rgba(99,102,241,.15) 0%, rgba(139,92,246,.1) 100%);
          color: var(--accent-tertiary);
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all .25s var(--ease-smooth);
          letter-spacing: .2px;
        }
        ._new-chat-btn:hover {
          background: linear-gradient(135deg, rgba(99,102,241,.25) 0%, rgba(139,92,246,.2) 100%);
          border-color: rgba(99,102,241,.5);
          box-shadow: 0 4px 20px rgba(99,102,241,.25);
          transform: translateY(-1px);
        }

        ._hist-search {
          margin: 0 16px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,.04);
          border: 1px solid var(--glass-border);
          transition: border-color .2s;
          flex-shrink: 0;
        }
        ._hist-search:focus-within {
          border-color: rgba(99,102,241,.4);
          background: rgba(99,102,241,.05);
        }
        ._hist-search-icon { color: var(--text-muted); flex-shrink: 0; }
        ._hist-search-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 13px;
          font-family: inherit;
        }
        ._hist-search-input::placeholder { color: var(--text-muted); }
        ._hist-search-clear {
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; display: flex; align-items: center; padding: 2px;
          transition: color .15s;
        }
        ._hist-search-clear:hover { color: var(--text-secondary); }

        ._hist-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--text-secondary);
          opacity: 0.6;
          padding: 0 20px 8px;
          flex-shrink: 0;
        }

        ._hist-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 10px 20px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          scrollbar-width: thin;
          scrollbar-color: rgba(99,102,241,.2) transparent;
        }
        ._hist-list::-webkit-scrollbar { width: 4px; }
        ._hist-list::-webkit-scrollbar-thumb { background: rgba(99,102,241,.2); border-radius: 4px; }

        ._hist-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 13px;
          padding: 40px 20px;
          text-align: center;
        }

        ._hist-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border-radius: 12px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all .2s ease;
          animation: fadeSlideDown .25s var(--ease-smooth) both;
          position: relative;
          overflow: hidden;
        }
        ._hist-item:hover {
          background: rgba(255,255,255,.04);
          border-color: var(--glass-border);
        }
        ._hist-item:hover ._hist-del { opacity: 1; }
        ._hist-item._hist-active {
          background: rgba(99,102,241,.1);
          border-color: rgba(99,102,241,.25);
        }
        ._hist-item._hist-active::before {
          content: '';
          position: absolute;
          left: 0; top: 20%; bottom: 20%;
          width: 3px;
          background: var(--accent-gradient);
          border-radius: 0 3px 3px 0;
        }

        ._hist-icon {
          width: 30px; height: 30px;
          border-radius: 9px;
          background: rgba(255,255,255,.05);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: var(--text-muted);
          transition: all .2s;
        }
        ._hist-icon-active {
          background: var(--accent-gradient) !important;
          color: white !important;
          box-shadow: 0 0 10px rgba(99,102,241,.3);
        }

        ._hist-item-text {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-secondary);
          min-width: 0;
        }
        ._hist-active ._hist-item-text {
          color: var(--text-primary);
          font-weight: 600;
        }

        ._hist-del {
          opacity: 0;
          background: none;
          border: none;
          color: var(--error);
          cursor: pointer;
          padding: 5px;
          border-radius: 6px;
          display: flex; align-items: center;
          transition: opacity .2s, background .15s;
          flex-shrink: 0;
        }
        ._hist-del:hover { background: var(--error-bg); }

        /* ── Main chat panel ─────────────────────────────────── */
        ._chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
          position: relative;
        }

        /* Background glow */
        ._chat-main::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,.05) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 80% 80%, rgba(139,92,246,.04) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Topbar ──────────────────────────────────────────── */
        ._chat-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(5,5,13,.7);
          backdrop-filter: blur(24px);
          z-index: 10;
          flex-shrink: 0;
          gap: 16px;
        }

        ._topbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        ._topbar-btn {
          width: 40px; height: 40px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,.04);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all .2s;
          flex-shrink: 0;
        }
        ._topbar-btn:hover {
          background: rgba(255,255,255,.08);
          color: var(--text-primary);
          border-color: rgba(99,102,241,.3);
        }

        ._topbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        ._topbar-logo {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: var(--accent-gradient);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 12px rgba(99,102,241,.3);
          animation: logo-pulse 3s ease-in-out infinite;
          flex-shrink: 0;
        }
        ._topbar-title {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: .5px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #fff 0%, var(--accent-tertiary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        ._topbar-badge {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .8px;
          padding: 2px 7px;
          border-radius: 6px;
          background: var(--accent-gradient);
          -webkit-text-fill-color: white;
          box-shadow: 0 2px 8px rgba(99,102,241,.4);
        }
        ._topbar-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        ._status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 6px var(--success);
          animation: status-pulse 1.8s ease-in-out infinite;
        }
        ._status-sep { opacity: .35; }

        ._topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        ._topbar-tool {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,.04);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all .2s;
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }
        ._topbar-tool:hover:not(:disabled) {
          background: rgba(255,255,255,.08);
          color: var(--text-primary);
          border-color: rgba(99,102,241,.3);
        }
        ._topbar-tool:disabled { opacity: .35; cursor: not-allowed; }
        ._topbar-tool._tool-active {
          background: rgba(99,102,241,.15);
          border-color: rgba(99,102,241,.4);
          color: var(--accent-tertiary);
          box-shadow: 0 0 14px rgba(99,102,241,.2);
        }
        ._tool-label {
          font-size: 12.5px;
        }
        @media (max-width: 768px) { ._tool-label { display: none; } }

        /* ── Voice waveform ──────────────────────────────────── */
        ._voice-wave {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 16px;
          margin-left: 4px;
        }
        ._wave-bar {
          width: 3px;
          border-radius: 2px;
          background: var(--accent-tertiary);
          animation: wave-bar 0.8s ease-in-out infinite alternate;
          height: 4px;
        }
        @keyframes wave-bar {
          0%   { height: 4px;  opacity: .4; }
          100% { height: 14px; opacity: 1;  }
        }

        /* ── Messages area ───────────────────────────────────── */
        ._messages-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: rgba(99,102,241,.2) transparent;
          position: relative;
          z-index: 1;
          contain: content;
        }
        ._messages-area::-webkit-scrollbar { width: 5px; }
        ._messages-area::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,.2);
          border-radius: 5px;
        }

        /* ── Welcome screen ──────────────────────────────────── */
        ._welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100%;
          padding: 40px 24px 60px;
          text-align: center;
          animation: fadeSlideDown .5s var(--ease-smooth) both;
        }

        ._orb-wrap {
          position: relative;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 36px;
        }
        ._orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(99,102,241,.15);
          animation: ring-expand 3s linear infinite;
          will-change: transform, opacity;
        }
        ._r1 { width: 110px; height: 110px; animation-delay: 0s; }
        ._r2 { width: 145px; height: 145px; animation-delay: 1.3s; }
        ._r3 { width: 175px; height: 175px; animation-delay: 2.6s; }
        @keyframes ring-expand {
          0%   { transform: scale(.7); opacity: .8; }
          100% { transform: scale(1.1); opacity: 0; }
        }
        ._orb-core {
          width: 88px;
          height: 88px;
          border-radius: 26px;
          background: var(--accent-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 40px rgba(99,102,241,.4), 0 0 80px rgba(99,102,241,.15);
          animation: orb-float 4s ease-in-out infinite;
          z-index: 2;
          position: relative;
          overflow: hidden;
        }
        ._core-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,.2) 0%, transparent 60%);
          pointer-events: none;
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%       { transform: translateY(-12px) rotate(3deg); }
        }

        ._welcome-h1 {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 900;
          letter-spacing: -1.5px;
          margin-bottom: 12px;
          line-height: 1.15;
        }
        ._welcome-gradient {
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        ._welcome-sub {
          color: var(--text-secondary);
          font-size: 16px;
          max-width: 500px;
          margin-bottom: 44px;
          line-height: 1.65;
        }

        /* Suggestion cards grid */
        ._sug-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          max-width: 720px;
          width: 100%;
          margin-bottom: 28px;
        }
        ._sug-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,.03);
          text-align: left;
          cursor: pointer;
          transition: all .25s var(--ease-smooth);
          animation: fadeSlideUp .4s var(--ease-smooth) both;
          position: relative;
          overflow: hidden;
        }
        ._sug-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--accent-gradient);
          opacity: 0;
          transition: opacity .25s;
        }
        ._sug-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99,102,241,.3);
          box-shadow: 0 12px 30px rgba(0,0,0,.3), 0 0 20px rgba(99,102,241,.1);
          background: rgba(255,255,255,.05);
        }
        ._sug-icon {
          width: 44px; height: 44px;
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: transform .2s var(--ease-bounce);
        }
        ._sug-card:hover ._sug-icon { transform: scale(1.1) rotate(-5deg); }
        ._sug-text { flex: 1; min-width: 0; }
        ._sug-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; color: var(--text-primary); }
        ._sug-desc  { font-size: 12px; color: var(--text-secondary); opacity: 0.8; }
        ._sug-arrow {
          font-size: 16px;
          color: var(--text-secondary);
          transition: transform .2s, color .2s;
        }
        ._sug-card:hover ._sug-arrow {
          transform: translateX(4px);
          color: var(--accent-tertiary);
        }

        ._welcome-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
          opacity: 0.7;
        }

        /* ── Message rows ────────────────────────────────────── */
        ._messages-inner {
          max-width: 780px;
          margin: 0 auto;
          width: 100%;
          padding: 32px 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        ._msg-row {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          animation: msg-appear .3s var(--ease-smooth) both;
        }
        @keyframes msg-appear {
          from { opacity: 0; transform: translateY(8px) scale(.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        ._user-row { flex-direction: row-reverse; }
        ._ai-row   { flex-direction: row; }

        ._msg-avatar {
          width: 38px; height: 38px;
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 15px;
          font-weight: 800;
        }
        ._user-av {
          background: rgba(255,255,255,.08);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
        }
        ._ai-av {
          background: var(--accent-gradient);
          box-shadow: 0 4px 16px rgba(99,102,241,.35);
        }
        ._thinking-av {
          animation: thinking-pulse 1.5s ease-in-out infinite;
        }
        @keyframes thinking-pulse {
          0%,100% { box-shadow: 0 4px 16px rgba(99,102,241,.35); }
          50%      { box-shadow: 0 4px 30px rgba(99,102,241,.65); }
        }

        ._msg-content { display: flex; flex-direction: column; gap: 6px; max-width: 78%; }
        ._user-row ._msg-content { align-items: flex-end; }

        ._msg-bubble {
          padding: 14px 20px;
          border-radius: 20px;
          font-size: 15px;
          line-height: 1.65;
          word-break: break-word;
          white-space: pre-wrap;
        }
        ._bubble-user {
          background: var(--accent-gradient);
          color: white;
          border-radius: 20px 4px 20px 20px;
          box-shadow: 0 6px 20px rgba(99,102,241,.3);
        }
        ._bubble-ai {
          background: rgba(255,255,255,.04);
          border: 1px solid var(--glass-border);
          border-radius: 4px 20px 20px 20px;
          color: var(--text-primary);
          backdrop-filter: blur(10px);
        }
        ._thinking-bubble {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
        }
        ._thinking-text {
          font-size: 13px;
          color: var(--text-muted);
          font-style: italic;
        }

        /* Action bar */
        ._msg-actions {
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity .2s;
        }
        ._ai-row:hover ._msg-actions { opacity: 1; }
        ._act-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,.04);
          color: var(--text-muted);
          font-size: 11.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all .15s;
        }
        ._act-btn:hover {
          background: rgba(255,255,255,.08);
          color: var(--text-primary);
          border-color: var(--glass-border-2);
        }

        /* ── Typing dots ─────────────────────────────────────── */
        ._typing-dots {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        ._typing-dots span {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--accent-secondary);
          display: inline-block;
          animation: dot-bounce 1.4s ease-in-out infinite;
        }
        ._typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        ._typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        ._typing-dots span:nth-child(3) { animation-delay: 0s; }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0); opacity: .4; }
          40%           { transform: scale(1.1); opacity: 1; }
        }

        /* ── Input zone ──────────────────────────────────────── */
        ._input-zone {
          padding: 16px 24px 24px;
          flex-shrink: 0;
          background: transparent;
          position: relative;
          z-index: 2;
        }

        /* Fade up gradient above input */
        ._input-zone::before {
          content: '';
          position: absolute;
          top: -40px; left: 0; right: 0;
          height: 40px;
          background: linear-gradient(to top, var(--bg-primary), transparent);
          pointer-events: none;
        }

        ._input-box {
          max-width: 780px;
          margin: 0 auto;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 10px 10px 10px 14px;
          border-radius: 24px;
          background: rgba(10,10,22,.85);
          backdrop-filter: blur(24px);
          border: 1.5px solid var(--glass-border);
          box-shadow: 0 8px 32px rgba(0,0,0,.4), 0 0 0 0 rgba(99,102,241,0);
          transition: border-color .25s, box-shadow .25s;
        }
        ._input-box._box-listening {
          border-color: rgba(99,102,241,.5);
          box-shadow: 0 8px 32px rgba(0,0,0,.4), 0 0 20px rgba(99,102,241,.15);
        }
        ._input-box._box-filled {
          border-color: rgba(99,102,241,.3);
        }
        ._input-box:focus-within {
          border-color: rgba(99,102,241,.45);
          box-shadow: 0 8px 32px rgba(0,0,0,.4), 0 0 0 3px rgba(99,102,241,.1);
        }

        ._input-mic {
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          background: rgba(255,255,255,.05);
          color: var(--text-secondary);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all .2s;
        }
        ._input-mic:hover { background: rgba(255,255,255,.1); color: var(--text-primary); }
        ._input-mic._mic-on {
          background: rgba(99,102,241,.2);
          border-color: rgba(99,102,241,.5);
          color: var(--accent-tertiary);
          animation: mic-pulse 1s ease-in-out infinite;
        }
        @keyframes mic-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,.3); }
          50%      { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
        }

        ._input-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 15px;
          font-family: inherit;
          line-height: 1.6;
          resize: none;
          max-height: 180px;
          overflow-y: auto;
          padding: 6px 0;
          scrollbar-width: thin;
        }
        ._input-textarea::placeholder { color: var(--text-muted); }
        ._input-textarea::-webkit-scrollbar { width: 3px; }
        ._input-textarea::-webkit-scrollbar-thumb { background: rgba(99,102,241,.2); border-radius: 3px; }

        ._send-btn {
          width: 44px; height: 44px;
          border-radius: 16px;
          border: none;
          background: rgba(99,102,241,.2);
          color: rgba(99,102,241,.5);
          display: flex; align-items: center; justify-content: center;
          cursor: not-allowed;
          transition: all .25s var(--ease-smooth);
          flex-shrink: 0;
        }
        ._send-btn._send-active {
          background: var(--accent-gradient);
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(99,102,241,.4);
        }
        ._send-btn._send-active:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 22px rgba(99,102,241,.55);
        }
        ._send-btn._send-active:active { transform: scale(.95); }
        ._send-btn:disabled { opacity: .5; cursor: not-allowed; }

        ._send-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }

        ._input-hint {
          max-width: 780px;
          margin: 8px auto 0;
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          opacity: .7;
        }
        ._input-hint kbd {
          display: inline-flex;
          align-items: center;
          padding: 1px 6px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.05);
          font-size: 10px;
          font-family: inherit;
        }

        /* ── Responsive ──────────────────────────────────────── */
        @media (max-width: 1024px) {
          ._hist-sidebar {
            position: absolute;
            height: 100%;
            top: 0; left: 0;
            z-index: 30;
          }
          ._hist-sidebar._open {
            width: min(300px, 90vw) !important;
            min-width: min(300px, 90vw) !important;
          }
          ._sug-grid { grid-template-columns: 1fr; }
          ._messages-inner { padding: 20px 16px 12px; }
          ._input-zone { padding: 12px 16px 20px; }
        }
        @media (max-width: 640px) {
          ._msg-content { max-width: 88%; }
          ._welcome-h1 { font-size: 26px; }
        }

        /* ── Shared keyframes ────────────────────────────────── */
        @keyframes logo-pulse {
          0%,100% { box-shadow: 0 0 12px rgba(99,102,241,.35); }
          50%      { box-shadow: 0 0 24px rgba(139,92,246,.6); }
        }
        @keyframes status-pulse {
          0%,100% { box-shadow: 0 0 4px var(--success); transform: scale(1); }
          50%      { box-shadow: 0 0 10px var(--success); transform: scale(1.3); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function Chat() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <ChatContent />
      </DashboardLayout>
    </AuthProvider>
  );
}