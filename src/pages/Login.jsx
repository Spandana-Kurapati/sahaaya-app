// src/pages/Login.jsx
// ──────────────────────────────────────────────────────────
// Sahaya — Login page with demo credentials
// ──────────────────────────────────────────────────────────
import { useState } from 'react';
import { login, DEMO_USERS } from '../auth.js';
import { Spinner } from '../components/ui.jsx';

const ROLE_PRESETS = [
  { role: 'admin',     label: 'Admin',     icon: '🛡️', email: 'admin@sahaya.org',  password: 'admin123', color: '#fb923c', desc: 'Full platform control' },
  { role: 'volunteer', label: 'Volunteer', icon: '🙋', email: 'arjun@sahaya.org',  password: 'vol123',   color: '#60a5fa', desc: 'Respond to incidents' },
  { role: 'user',      label: 'Citizen',   icon: '👤', email: 'sneha@sahaya.org',  password: 'user123',  color: '#f472b6', desc: 'Report emergencies' },
];

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);

  function fillPreset(preset) {
    setSelected(preset.role);
    setEmail(preset.email);
    setPassword(preset.password);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 600)); // UX delay
    const session = login(email, password);
    if (!session) {
      setError('Invalid email or password. Use the demo cards below.');
      setLoading(false);
      return;
    }
    onLogin(session);
  }

  return (
    <div className="grain min-h-screen bg-[var(--bg-deep)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fb923c22, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #60a5fa22, transparent 70%)' }} />
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 stagger-1">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 relative"
            style={{ background: 'linear-gradient(135deg, #fb923c, #ea580c)', boxShadow: '0 8px 32px #fb923c44' }}>
            <span className="text-3xl">🤝</span>
          </div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight text-white mb-2">
            Sahaya
          </h1>
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
            Smart Resource Allocation · Crisis Response Platform
          </p>
        </div>

        {/* Role quick-select */}
        <div className="grid grid-cols-3 gap-3 mb-6 stagger-2">
          {ROLE_PRESETS.map(p => (
            <button key={p.role} onClick={() => fillPreset(p)}
              className={`glass rounded-2xl p-4 text-center transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
                selected === p.role ? 'glass-lit' : 'hover:bg-white/5'
              }`}
              style={selected === p.role ? { borderColor: p.color + '55' } : {}}>
              <div className="text-2xl mb-2">{p.icon}</div>
              <p className="text-xs font-display font-bold" style={{ color: selected === p.role ? p.color : 'var(--text-primary)' }}>
                {p.label}
              </p>
              <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {p.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Login form */}
        <div className="glass rounded-2xl p-6 stagger-3">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Enter email..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-body text-white placeholder-white/20
                  focus:outline-none focus:border-[#fb923c66] focus:ring-1 focus:ring-[#fb923c22] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-body mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter password..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-body text-white placeholder-white/20
                  focus:outline-none focus:border-[#fb923c66] focus:ring-1 focus:ring-[#fb923c22] transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-xs font-body"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 font-display font-bold text-sm text-zinc-900 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #fb923c, #ea580c)',
                boxShadow: '0 4px 20px rgba(251,146,60,0.35)',
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? <><Spinner size={16} color="#7c2d12" /> Signing in...</> : 'Sign In →'}
            </button>
          </form>
        </div>

        {/* Demo hint */}
        <div className="mt-5 glass rounded-2xl p-4 stagger-4">
          <p className="text-xs font-body mb-3" style={{ color: 'var(--text-muted)' }}>
            🔑 Demo credentials — click a role above or use manually:
          </p>
          <div className="space-y-1.5">
            {DEMO_USERS.filter(u => ['admin-001','vol-001','user-001'].includes(u.id)).map(u => (
              <div key={u.id} className="flex items-center gap-3 text-xs font-body">
                <span style={{ color: 'var(--text-muted)', width: 60 }} className="capitalize">{u.role}</span>
                <code className="text-[var(--text-primary)] opacity-70">{u.email}</code>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <code style={{ color: '#fb923c' }}>{u.password}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
