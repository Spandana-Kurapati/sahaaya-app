// src/pages/Dashboard.jsx
// ──────────────────────────────────────────────────────────
// Sahaya — Public Landing Dashboard
// Shown before login: hero, live stats, map preview, features
// ──────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { incidentStore, volunteerStore } from '../store.js';
import IncidentMap from '../components/IncidentMap.jsx';

// ── Animated counter hook ──────────────────────────────────
function useCounter(target, duration = 1800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// ── Stat bubble ────────────────────────────────────────────
function StatBubble({ value, label, icon, color, suffix = '' }) {
  const count = useCounter(value);
  return (
    <div className="glass rounded-2xl p-5 flex flex-col items-center text-center group hover:scale-105 transition-transform duration-300">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        {icon}
      </div>
      <p className="text-3xl font-bold font-display" style={{ color }}>
        {count}{suffix}
      </p>
      <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

// ── Feature card ───────────────────────────────────────────
function FeatureCard({ icon, title, description, color, delay }) {
  return (
    <div
      className="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300 hover:-translate-y-1 cursor-default"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        {icon}
      </div>
      <h3 className="font-display font-bold text-base mb-2">{title}</h3>
      <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  );
}

// ── Role card ─────────────────────────────────────────────
function RoleCard({ role, icon, color, description, perks, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left glass rounded-2xl p-6 transition-all duration-300 hover:scale-105 focus:outline-none"
      style={{
        border: hovered ? `1px solid ${color}50` : '1px solid var(--border)',
        background: hovered ? `${color}08` : 'rgba(255,255,255,0.04)',
        boxShadow: hovered ? `0 8px 32px ${color}20` : 'none',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-base">{role}</h3>
            {hovered && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
                style={{ background: `${color}20`, color }}
              >
                Login →
              </span>
            )}
          </div>
          <p className="text-xs font-body mb-3" style={{ color: 'var(--text-muted)' }}>{description}</p>
          <div className="space-y-1">
            {perks.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color }}>✓</span> {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Pulse dot for map ──────────────────────────────────────
function PulseDot({ x, y, color, delay }) {
  return (
    <div
      className="absolute w-3 h-3 rounded-full animate-pulse"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        background: color,
        boxShadow: `0 0 12px ${color}, 0 0 24px ${color}40`,
        transform: 'translate(-50%, -50%)',
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard({ onLoginClick }) {
  const [incidents, setIncidents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const u1 = incidentStore.subscribe(setIncidents);
    const u2 = volunteerStore.subscribe(setVolunteers);
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const stats = {
    incidents: incidents.length || 24,
    volunteers: volunteers.length || 18,
    resolved: incidents.filter(i => i.status === 'Resolved').length || 12,
    response: 8,
  };

  const recentActivity = [
    { icon: '🚨', text: 'Flood reported in Dilsukhnagar', time: '2m ago', color: '#f87171' },
    { icon: '👷', text: 'Volunteer Ravi assigned to Medical', time: '5m ago', color: '#60a5fa' },
    { icon: '✅', text: 'Shelter incident resolved in Kukatpally', time: '12m ago', color: '#4ade80' },
    { icon: '📋', text: 'New rescue request in Secunderabad', time: '18m ago', color: '#fb923c' },
    { icon: '💬', text: 'Admin messaged 3 volunteers', time: '25m ago', color: '#c084fc' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: scrollY > 40 ? 'rgba(10,10,15,0.92)' : 'transparent',
          backdropFilter: scrollY > 40 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 40 ? '1px solid var(--border)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)', boxShadow: '0 4px 12px #fb923c44' }}
            >
              🤝
            </div>
            <div>
              <p className="font-display font-extrabold text-lg leading-none">Sahaya</p>
              <p className="text-xs font-body" style={{ color: '#fb923c' }}>Disaster Relief Platform</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-body font-medium" style={{ color: 'var(--text-muted)' }}>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#roles" className="hover:text-white transition-colors">Roles</a>
            <a href="#map" className="hover:text-white transition-colors">Live Map</a>
            <a href="#activity" className="hover:text-white transition-colors">Activity</a>
          </div>

          {/* Login btn */}
          <button
            onClick={onLoginClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#fb923c,#ea580c)',
              boxShadow: '0 4px 16px #fb923c44',
              color: '#fff',
            }}
          >
            <span>Login</span>
            <span>→</span>
          </button>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-24 px-6 overflow-hidden">

        {/* Background orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 70%)', transform: `translateY(${scrollY * 0.15}px)` }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)' }}
        />

        {/* Badge */}
        <div
          className="glass-lit px-4 py-1.5 rounded-full text-xs font-body font-medium mb-8 flex items-center gap-2"
          style={{ color: '#fb923c' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#fb923c] animate-pulse inline-block" />
          Platform Active — {stats.incidents} Incidents Tracked
        </div>

        {/* Heading */}
        <h1 className="text-center font-display font-extrabold max-w-4xl leading-tight mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
          Rapid Response,{' '}
          <span
            className="relative"
            style={{
              background: 'linear-gradient(135deg, #fb923c, #ea580c, #f97316)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Coordinated Relief
          </span>
        </h1>

        <p className="text-center font-body text-lg max-w-2xl leading-relaxed mb-10" style={{ color: 'var(--text-muted)' }}>
          Sahaya connects citizens in crisis with trained volunteers and admins —
          enabling real-time incident reporting, AI-powered triage, and live map coordination.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            onClick={onLoginClick}
            className="px-8 py-3.5 rounded-xl font-body font-semibold text-base transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#fb923c,#ea580c)',
              boxShadow: '0 8px 32px #fb923c44',
              color: '#fff',
            }}
          >
            Get Started — Login
          </button>
          <a
            href="#features"
            className="glass px-8 py-3.5 rounded-xl font-body font-semibold text-base transition-all duration-200 hover:bg-white/8 hover:scale-105"
          >
            Explore Features ↓
          </a>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full">
          <StatBubble value={stats.incidents}  label="Active Incidents" icon="📍" color="#fb923c" />
          <StatBubble value={stats.volunteers} label="Volunteers On-Call" icon="👷" color="#60a5fa" />
          <StatBubble value={stats.resolved}   label="Resolved Today" icon="✅" color="#4ade80" />
          <StatBubble value={stats.response}   label="Avg Response (min)" icon="⚡" color="#c084fc" suffix="m" />
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-body uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>Platform Features</p>
            <h2 className="text-4xl font-display font-extrabold mb-4">Everything you need in a crisis</h2>
            <p className="font-body max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              From incident reporting to volunteer dispatch — Sahaya handles every step with speed and clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon="📍" title="Real-Time Incident Reporting" color="#fb923c" delay={0}
              description="Citizens report emergencies with location, photos, and category. AI automatically prioritizes and summarizes each report." />
            <FeatureCard icon="🗺️" title="Live Map Coordination" color="#60a5fa" delay={50}
              description="See all active incidents on a real-time OpenStreetMap. Color-coded by priority so responders know exactly where to go." />
            <FeatureCard icon="🤖" title="AI-Powered Triage" color="#c084fc" delay={100}
              description="Gemini AI analyzes incident images and descriptions, assigns priority scores, and generates actionable summaries instantly." />
            <FeatureCard icon="👷" title="Volunteer Management" color="#4ade80" delay={150}
              description="Admins manage volunteer rosters, track tasks completed, and assign volunteers to specific incidents in real time." />
            <FeatureCard icon="💬" title="Integrated Chat" color="#facc15" delay={200}
              description="Direct messaging between admins, volunteers, and users. Keep everyone in sync without leaving the platform." />
            <FeatureCard icon="📊" title="Status Tracking" color="#f87171" delay={250}
              description="Users track their incident from 'Reported' to 'Resolved' with a live timeline and volunteer assignment details." />
          </div>
        </div>
      </section>

      {/* ── Role Cards Section ───────────────────────────────── */}
      <section id="roles" className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-body uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>Who uses Sahaya</p>
            <h2 className="text-4xl font-display font-extrabold mb-4">Three roles, one mission</h2>
            <p className="font-body max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Click any role to login. Each has a tailored interface built for their responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <RoleCard
              role="Citizen / User" icon="🙋" color="#fb923c"
              description="Report emergencies and track their resolution in real time."
              perks={['Submit incident reports with photos', 'AI-powered priority analysis', 'Live status timeline', 'Chat with assigned volunteer']}
              onClick={onLoginClick}
            />
            <RoleCard
              role="Volunteer" icon="👷" color="#60a5fa"
              description="Accept assignments and coordinate relief efforts on the ground."
              perks={['View assigned incidents on map', 'Accept & update incident status', 'Track your impact (tasks/hours)', 'Chat with admin & users']}
              onClick={onLoginClick}
            />
            <RoleCard
              role="Administrator" icon="⚙️" color="#c084fc"
              description="Oversee all operations, manage volunteers, and resolve escalations."
              perks={['Full incident feed with global map', 'Add/remove volunteers', 'Flag problematic volunteers', 'Message anyone on the platform']}
              onClick={onLoginClick}
            />
          </div>
        </div>
      </section>

      {/* ── Map Preview Section ──────────────────────────────── */}
      <section id="map" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-body uppercase tracking-widest mb-3" style={{ color: '#60a5fa' }}>Live Map Preview</p>
            <h2 className="text-4xl font-display font-extrabold mb-4">Incidents visualized in real-time</h2>
            <p className="font-body max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Sahaya uses OpenStreetMap — a completely free, open-source, real map. No API key needed.
            </p>
          </div>

          {/* Faux map visualization */}
          <div
            className="relative rounded-3xl overflow-hidden border border-white/7"
            style={{ height: 400, background: 'linear-gradient(135deg, #0d1117 0%, #0a1628 50%, #0d1117 100%)' }}
          >
            {/* Grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-10" style={{ pointerEvents: 'none' }}>
              {[...Array(8)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${(i + 1) * 12.5}%`} x2="100%" y2={`${(i + 1) * 12.5}%`} stroke="#60a5fa" strokeWidth="0.5" />
              ))}
              {[...Array(10)].map((_, i) => (
                <line key={`v${i}`} x1={`${(i + 1) * 9.1}%`} y1="0" x2={`${(i + 1) * 9.1}%`} y2="100%" stroke="#60a5fa" strokeWidth="0.5" />
              ))}
            </svg>

            {/* City label */}
            <div className="absolute top-4 left-4 glass px-3 py-1.5 rounded-lg text-xs font-body" style={{ color: 'var(--text-muted)' }}>
              📍 Hyderabad, Telangana
            </div>

            {/* Pulse dots for incidents */}
            <PulseDot x={45} y={40} color="#f87171" delay={0} />
            <PulseDot x={60} y={55} color="#fb923c" delay={300} />
            <PulseDot x={35} y={65} color="#60a5fa" delay={600} />
            <PulseDot x={70} y={30} color="#4ade80" delay={900} />
            <PulseDot x={25} y={45} color="#f87171" delay={1200} />
            <PulseDot x={55} y={70} color="#c084fc" delay={1500} />
            <PulseDot x={80} y={60} color="#fb923c" delay={200} />
            <PulseDot x={40} y={20} color="#4ade80" delay={700} />

            {/* Legend */}
            <div className="absolute bottom-4 right-4 glass rounded-xl p-3 text-xs font-body space-y-1.5">
              {[['🔴 High Priority', '#f87171'], ['🟡 Medium', '#fb923c'], ['🔵 Low', '#60a5fa'], ['🟢 Resolved', '#4ade80']].map(([label, color]) => (
                <div key={label} className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>

            {/* CTA overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center glass rounded-2xl px-8 py-6 mx-4">
                <p className="font-display font-bold text-lg mb-2">Real map inside the app</p>
                <p className="text-sm font-body mb-4" style={{ color: 'var(--text-muted)' }}>
                  Powered by OpenStreetMap & Leaflet — 100% free, no API key required
                </p>
                <button
                  onClick={onLoginClick}
                  className="px-5 py-2.5 rounded-xl text-sm font-body font-semibold transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff' }}
                >
                  Open Live Map →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Activity Feed Section ────────────────────────────── */}
      <section id="activity" className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-body uppercase tracking-widest mb-3" style={{ color: '#4ade80' }}>Live Activity</p>
            <h2 className="text-4xl font-display font-extrabold mb-4">Platform in action</h2>
          </div>

          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="glass rounded-2xl px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-all"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
                >
                  {item.icon}
                </div>
                <p className="flex-1 text-sm font-body">{item.text}</p>
                <span className="text-xs font-body flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{item.time}</span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={onLoginClick}
              className="px-8 py-3.5 rounded-xl font-body font-semibold transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg,#fb923c,#ea580c)',
                boxShadow: '0 8px 32px #fb923c30',
                color: '#fff',
              }}
            >
              Join the Platform →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)' }}
            >
              🤝
            </div>
            <div>
              <p className="font-display font-bold text-sm">Sahaya</p>
              <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Disaster Relief Platform</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm font-body" style={{ color: 'var(--text-muted)' }}>
            <span>OpenStreetMap tiles — Free & Open Source</span>
            <span>•</span>
            <span>AI Triage by Gemini</span>
            <span>•</span>
            <span>Built with React + Tailwind</span>
          </div>

          <button
            onClick={onLoginClick}
            className="text-sm font-body font-semibold px-4 py-2 rounded-xl transition-all hover:scale-105"
            style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}
          >
            Login →
          </button>
        </div>
      </footer>
    </div>
  );
}
