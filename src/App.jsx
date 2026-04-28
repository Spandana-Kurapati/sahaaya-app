// src/App.jsx
// ──────────────────────────────────────────────────────────
// Sahaya — Root component with auth + role-based routing
// ──────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { getSession, logout } from './auth.js';
import { ToastContainer } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import Volunteer from './pages/Volunteer.jsx';
import User from './pages/User.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { BRAND } from './constants.js';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [showLogin, setShowLogin] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = getSession();
    setSession(saved || null);
  }, []);

  function handleLogin(sess) {
    setSession(sess);
    setShowLogin(false);
  }

  function handleLogout() {
    logout();
    setSession(null);
    setShowLogin(false);
  }

  // ── Loading splash ──────────────────────────────────────
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 animate-pulse"
            style={{
              background: BRAND.gradient,
              boxShadow: '0 8px 32px rgba(251,146,60,0.4)',
            }}
          >
            🤝
          </div>
          <p className="font-display font-bold text-lg">Sahaya</p>
          <p className="text-sm font-body mt-1 animate-pulse" style={{ color: 'var(--text-muted)' }}>
            Loading platform...
          </p>
        </div>
      </div>
    );
  }

  // ── Already logged in: route by role ───────────────────
  if (session) {
    return (
      <>
        <ToastContainer />
        {session.role === 'admin'     && <Admin     user={session} onLogout={handleLogout} />}
        {session.role === 'volunteer' && <Volunteer user={session} onLogout={handleLogout} />}
        {session.role === 'user'      && <User      user={session} onLogout={handleLogout} />}
      </>
    );
  }

  // ── Not logged in: show Login modal over Dashboard ─────
  if (showLogin) {
    return (
      <>
        <ToastContainer />
        {/* Dashboard behind login */}
        <div className="pointer-events-none opacity-30 blur-sm fixed inset-0 overflow-hidden">
          <Dashboard onLoginClick={() => {}} />
        </div>
        {/* Login modal overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-md">
            {/* Close button */}
            <button
              onClick={() => setShowLogin(false)}
              className="absolute -top-4 -right-4 z-10 w-9 h-9 rounded-full glass flex items-center justify-center text-sm hover:bg-white/10 transition-all"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ✕
            </button>
            <Login onLogin={handleLogin} />
          </div>
        </div>
      </>
    );
  }

  // ── Default: show landing dashboard ────────────────────
  return (
    <>
      <ToastContainer />
      <Dashboard onLoginClick={() => setShowLogin(true)} />
    </>
  );
}
