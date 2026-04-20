import { useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';
import { signInWithGoogle } from '../firebase';
import { 
  Sparkles, Mail, Lock, User, ArrowRight, Bot, 
  Zap, Shield, Brain, CheckCircle2, Cpu, Activity
} from 'lucide-react';

/* Animated particle canvas */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.3 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.opacity})`;
        ctx.fill();
      });
      // Draw connections
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(99,102,241,${(1 - d / 120) * 0.12})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .7, pointerEvents: 'none' }}
    />
  );
}

const features = [
  { icon: Brain,     label: 'AI-Powered Assistant',     desc: 'Natural language task management' },
  { icon: Calendar,  label: 'Smart Calendar',            desc: 'Intelligent scheduling & reminders' },
  { icon: Zap,       label: 'Voice Commands',            desc: 'Talk to JARVIS hands-free' },
  { icon: Shield,    label: 'Privacy First',             desc: 'Your data, secured always' },
  { icon: Activity,  label: 'Productivity Analytics',    desc: 'Real-time insights & coaching' },
];

import { Calendar } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin]     = useState(true);
  const [formData, setFormData]   = useState({ username: '', email: '', password: '', name: '' });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [mounted, setMounted]     = useState(false);
  const [showPass, setShowPass]   = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (token) window.location.href = '/dashboard';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const response = isLogin
        ? await authAPI.login({ email: formData.email, password: formData.password })
        : await authAPI.register(formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError('');
    try {
      const googleResult = await signInWithGoogle();
      if (!googleResult.success) { setError(googleResult.error || 'Google sign-in failed'); return; }
      const response = await authAPI.googleLogin({
        idToken: googleResult.user.idToken,
        email: googleResult.user.email,
        name: googleResult.user.displayName,
        photoURL: googleResult.user.photoURL
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ padding: 0 }}>
      {/* Grid split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* ── Left Hero ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>
          <ParticleCanvas />

          {/* Floating orbs */}
          <div style={{
            position: 'absolute', top: '10%', right: '5%',
            width: '300px', height: '300px',
            background: 'radial-gradient(circle, rgba(99,102,241,.15) 0%, transparent 70%)',
            borderRadius: '50%', animation: 'float 8s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', left: '-5%',
            width: '250px', height: '250px',
            background: 'radial-gradient(circle, rgba(139,92,246,.12) 0%, transparent 70%)',
            borderRadius: '50%', animation: 'float 10s ease-in-out infinite reverse',
            pointerEvents: 'none'
          }} />

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '56px', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '52px', height: '52px',
              background: 'var(--accent-gradient)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-sm)',
              animation: 'logo-pulse 3s ease-in-out infinite'
            }}>
              <Sparkles size={24} color="white" />
            </div>
            <div>
              <div style={{
                fontSize: '24px', fontWeight: 800, letterSpacing: '2px',
                background: 'linear-gradient(135deg, #fff 0%, var(--accent-tertiary) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>JARVIS</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px' }}>INTELLIGENT PLANNER</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)',
              fontSize: '12px', fontWeight: 700, color: 'var(--accent-tertiary)',
              letterSpacing: '.5px', marginBottom: '24px'
            }}>
              <Cpu size={12} />
              POWERED BY ADVANCED AI
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 4vw, 54px)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-2px',
              marginBottom: '20px'
            }}>
              Your Intelligent
              <br />
              <span className="shimmer-text">Life Assistant</span>
            </h1>

            <p style={{
              fontSize: '17px',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              marginBottom: '40px'
            }}>
              Manage tasks, calendar, and notes with AI. Voice commands,
              smart reminders, and personalized daily insights — all in one place.
            </p>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {features.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    animation: `fadeSlideDown ${0.4 + i * 0.1}s var(--ease-smooth) both`
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(99,102,241,.1)',
                    border: '1px solid rgba(99,102,241,.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-secondary)',
                    flex: 'none'
                  }}>
                    <f.icon size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1px' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.desc}</div>
                  </div>
                  <CheckCircle2 size={16} style={{ color: 'var(--success)', marginLeft: 'auto', flex: 'none' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'absolute', bottom: '32px', left: '60px', fontSize: '12px', color: 'var(--text-muted)' }}>
            © 2026 JARVIS AI System · Privacy · Terms
          </div>
        </div>

        {/* ── Right Auth Panel ─────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px',
          background: 'linear-gradient(180deg, rgba(13,13,26,.7) 0%, rgba(5,5,13,.9) 100%)',
          borderLeft: '1px solid var(--glass-border)',
          backdropFilter: 'blur(24px)'
        }}>
          <div style={{ width: '100%', maxWidth: '420px', animation: 'cardEnter .6s var(--ease-smooth) both' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '56px', height: '56px',
                background: 'var(--accent-gradient)',
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: 'var(--shadow-glow-sm)',
                animation: 'logo-pulse 3s ease-in-out infinite'
              }}>
                <Bot size={26} color="white" />
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-.5px', marginBottom: '6px' }}>
                {isLogin ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {isLogin ? 'Sign in to continue with JARVIS' : 'Create your JARVIS account'}
              </p>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(true); setError(''); }}>
                Sign In
              </button>
              <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(false); setError(''); }}>
                Register
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '13px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--error-bg)',
                border: '1px solid rgba(239,68,68,.25)',
                color: 'var(--error)',
                marginBottom: '18px',
                fontSize: '13.5px',
                animation: 'fadeSlideDown .3s ease both'
              }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <div className="input-wrapper">
                      <User size={16} className="input-icon" />
                      <input type="text" className="input input-with-icon"
                        placeholder="Choose a username"
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div className="input-wrapper">
                      <User size={16} className="input-icon" />
                      <input type="text" className="input input-with-icon"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input type="email" className="input input-with-icon"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input type={showPass ? 'text' : 'password'} className="input input-with-icon"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required minLength={6}
                    style={{ paddingRight: '46px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit'
                    }}
                  >
                    {showPass ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
                disabled={loading}
              >
                {loading ? (
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                ) : (
                  <>
                    {isLogin ? 'Sign In to JARVIS' : 'Create Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '22px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>OR CONTINUE WITH</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
            </div>

            {/* Google */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '14px', gap: '12px' }}
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.96 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.96 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Trust badges */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '20px',
              marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)'
            }}>
              {['256-bit Encryption', 'GDPR Compliant', 'No Data Selling'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <Shield size={11} style={{ color: 'var(--success)' }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 1024px) {
          .auth-page > div { grid-template-columns: 1fr !important; }
          .auth-page > div > div:first-child { display: none !important; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-20px) scale(1.03); }
        }
        @keyframes logo-pulse {
          0%, 100% { box-shadow: 0 0 16px rgba(99,102,241,.4); }
          50%       { box-shadow: 0 0 32px rgba(139,92,246,.7); }
        }
      `}</style>
    </div>
  );
}