import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../components/Layout';
import DashboardLayout from '../components/Layout';
import { authAPI } from '../services/api';
import { requestNotificationPermission } from '../firebase';
import { 
  User, Bell, Mic, MessageSquare, Shield, Save, 
  Moon, Sun, Globe, Key, Smartphone, Mail, 
  Check, AlertCircle, Camera, Volume2
} from 'lucide-react';

function SettingsContent() {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    telegramId: '',
    whatsappNumber: '',
    preferences: {
      theme: 'dark',
      language: 'en',
      notifications: true,
      voiceEnabled: true,
      dailySummary: true,
      emailNotifications: false
    }
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        telegramId: user.telegramId || '',
        whatsappNumber: user.whatsappNumber || '',
        preferences: user.preferences || {
          theme: 'dark',
          language: 'en',
          notifications: true,
          voiceEnabled: true,
          dailySummary: true,
          emailNotifications: false
        }
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await authAPI.updateMe(formData);
      setUser(res.data.user);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        await authAPI.updatePushToken(token);
        setMessage({ type: 'success', text: 'Notifications enabled successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Permission denied or browser not supported' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error enabling notifications' });
    }
  };

  const Toggle = ({ checked, onChange }) => (
    <div 
      className={`toggle ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
      style={{ cursor: 'pointer' }}
    />
  );

  const SettingItem = ({ icon: Icon, title, description, children }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '18px 20px',
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '44px', 
          height: '44px', 
          borderRadius: 'var(--radius-md)',
          background: 'var(--glass-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 500, marginBottom: '2px' }}>{title}</div>
          {description && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{description}</div>
          )}
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="main-content">
      <div className="header">
        <div>
          <h1>Settings</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Manage your account and preferences
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-section">
          <h3 className="settings-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <User size={20} /> Profile
          </h3>
          <div className="glass card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: 'var(--radius-lg)',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 700,
                position: 'relative'
              }}>
                {formData.name?.[0] || formData.email?.[0] || 'U'}
                <button 
                  type="button"
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    border: '2px solid var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={14} />
                </button>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                  {formData.name || 'Set your name'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {formData.email}
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <MessageSquare size={20} /> Messaging Apps
          </h3>
          <div className="glass card" style={{ padding: '8px' }}>
            <SettingItem 
              icon={Key} 
              title="Telegram" 
              description="Connect for bot commands & alerts"
            >
              <input
                type="text"
                className="input"
                style={{ width: '180px' }}
                value={formData.telegramId}
                onChange={e => setFormData({ ...formData, telegramId: e.target.value })}
                placeholder="Your Telegram ID"
              />
            </SettingItem>
            
            <SettingItem 
              icon={Smartphone} 
              title="WhatsApp" 
              description="Connect for notifications"
            >
              <input
                type="tel"
                className="input"
                style={{ width: '180px' }}
                value={formData.whatsappNumber}
                onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </SettingItem>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Volume2 size={20} /> Voice & Speech
          </h3>
          <div className="glass card" style={{ padding: '8px' }}>
            <SettingItem 
              icon={Mic} 
              title="Voice Commands" 
              description="Enable voice interactions with JARVIS"
            >
              <Toggle 
                checked={formData.preferences.voiceEnabled}
                onChange={(checked) => setFormData({ 
                  ...formData, 
                  preferences: { ...formData.preferences, voiceEnabled: checked }
                })}
              />
            </SettingItem>
            
            <div style={{ padding: '18px 20px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Example Commands</div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '8px',
                fontSize: '13px', 
                color: 'var(--text-secondary)' 
              }}>
                <div>• "Jarvis, plan my day"</div>
                <div>• "Jarvis, add task finish report"</div>
                <div>• "Jarvis, schedule meeting"</div>
                <div>• "Jarvis, create note meeting notes"</div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Bell size={20} /> Notifications
          </h3>
          <div className="glass card" style={{ padding: '8px' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--glass-border)', marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Browser Notifications</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Enable push alerts on this device</div>
                </div>
                <button 
                  type="button"
                  onClick={handleEnableNotifications}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Enable Now
                </button>
              </div>
            </div>

            <SettingItem 
              icon={Bell} 
              title="Push Reminders" 
              description="Receive task reminders and alerts"
            >
              <Toggle 
                checked={formData.preferences.notifications}
                onChange={(checked) => setFormData({ 
                  ...formData, 
                  preferences: { ...formData.preferences, notifications: checked }
                })}
              />
            </SettingItem>
            
            <SettingItem 
              icon={Mail} 
              title="Daily Summary" 
              description="Get daily AI-powered summary via Email"
            >
              <Toggle 
                checked={formData.preferences.dailySummary}
                onChange={(checked) => setFormData({ 
                  ...formData, 
                  preferences: { ...formData.preferences, dailySummary: checked }
                })}
              />
            </SettingItem>
            
            <SettingItem 
              icon={Mail} 
              title="Email Updates" 
              description="Get important system and task emails"
            >
              <Toggle 
                checked={formData.preferences.emailNotifications}
                onChange={(checked) => setFormData({ 
                  ...formData, 
                  preferences: { ...formData.preferences, emailNotifications: checked }
                })}
              />
            </SettingItem>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Globe size={20} /> Preferences
          </h3>
          <div className="glass card" style={{ padding: '8px' }}>
            <SettingItem 
              icon={Globe} 
              title="Language" 
              description="App display language"
            >
              <select
                className="select"
                style={{ width: '150px' }}
                value={formData.preferences.language}
                onChange={e => setFormData({ 
                  ...formData, 
                  preferences: { ...formData.preferences, language: e.target.value }
                })}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
              </select>
            </SettingItem>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {message.text && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: message.type === 'error' ? 'var(--error)' : 'var(--success)'
            }}>
              {message.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
              {message.text}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default function Settings() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </AuthProvider>
  );
}