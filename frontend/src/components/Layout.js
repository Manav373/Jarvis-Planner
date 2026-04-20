import { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, CheckSquare, Calendar, FileText, 
  MessageSquare, Settings, LogOut, Sparkles, Activity,
  Menu, X, Cpu, Zap
} from 'lucide-react';
import { authAPI } from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
          if (typeof window !== 'undefined') window.location.href = '/';
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  href: '/dashboard', color: '#6366f1' },
  { icon: CheckSquare,     label: 'Tasks',       href: '/tasks',     color: '#22c55e' },
  { icon: Calendar,        label: 'Calendar',    href: '/calendar',  color: '#f59e0b' },
  { icon: FileText,        label: 'Notes',       href: '/notes',     color: '#ec4899' },
  { icon: MessageSquare,   label: 'Chat',        href: '/chat',      color: '#8b5cf6' },
  { icon: Settings,        label: 'Settings',    href: '/settings',  color: '#64748b' },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted]         = useState(false);

  let authContext = null;
  try { authContext = useAuth(); } catch (_) {}

  const router  = useRouter();
  const user    = authContext?.user;
  const logout  = authContext?.logout;
  const loading = authContext?.loading;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') router.push('/');
  }, [loading, user, router]);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 1024) setSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [router.pathname]);

  if (loading || !mounted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary)', flexDirection: 'column', gap: '20px'
      }}>
        <div style={{
          width: '64px', height: '64px',
          background: 'var(--accent-gradient)',
          borderRadius: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-glow-sm)',
          animation: 'logo-pulse 1.5s ease-in-out infinite'
        }}>
          <Sparkles size={28} color="white" />
        </div>
        <div className="loading-spinner" />
        <style jsx global>{`
          @keyframes logo-pulse {
            0%, 100% { box-shadow: 0 0 16px rgba(99,102,241,.4); transform: scale(1); }
            50%      { box-shadow: 0 0 32px rgba(99,102,241,.6); transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href) => router.pathname === href;
  const initials = (user.name || user.username || 'U')[0].toUpperCase();

  return (
    <div className="layout-container">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile toggle */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">
            <Sparkles size={22} color="white" />
          </div>
          <div>
            <div className="logo-text">JARVIS</div>
          </div>
          <span className="logo-version">AI</span>
        </div>

        {/* AI Status pill */}
        <div className="ai-status" style={{ marginBottom: '20px' }}>
          <div className="ai-status-dot" />
          <Cpu size={13} />
          <span>AI Engine Active</span>
        </div>

        {/* Nav */}
        <div className="nav-section-label">Navigation</div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item, i) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div
                  className="nav-icon"
                  style={{
                    color: active ? item.color : 'inherit',
                    filter: active ? `drop-shadow(0 0 6px ${item.color}88)` : 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <item.icon size={19} />
                </div>
                <span>{item.label}</span>
                {active && (
                  <div style={{
                    marginLeft: 'auto',
                    width: '6px', height: '6px',
                    borderRadius: '50%',
                    background: item.color,
                    boxShadow: `0 0 8px ${item.color}`,
                    animation: 'status-pulse 2s ease-in-out infinite'
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <div className="sidebar-user">
            <div className="avatar avatar-sm">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px', fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user.name || user.username}
              </div>
              <div style={{
                fontSize: '11px', color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user.email}
              </div>
            </div>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 6px var(--success)',
              flex: 'none'
            }} />
          </div>

          <button
            onClick={logout}
            className="nav-item"
            style={{ width: '100%', color: 'var(--error)', border: 'none', background: 'transparent' }}
          >
            <LogOut size={17} style={{ flex: 'none' }} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-wrapper">
        {children}
      </main>

      <style jsx global>{`
        @keyframes status-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.5); opacity: .5; }
        }
      `}</style>
    </div>
  );
}