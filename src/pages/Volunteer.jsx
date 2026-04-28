// src/pages/Volunteer.jsx
// ──────────────────────────────────────────────────────────
// Sahaya — Volunteer Interface
// Floating Bottom Nav: Map | Chats | Profile
// ──────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { getAllUsers } from '../auth.js';
import { incidentStore, chatStore, haversine } from '../store.js';
import IncidentMap from '../components/IncidentMap.jsx';
import {
  AppHeader, Avatar, PriorityBadge, StatusBadge, CategoryIcon,
  StatCard, InlineChat, Spinner, toast,
} from '../components/ui.jsx';

const NAV = [
  { key: 'map',     label: 'Map',     icon: '🗺️' },
  { key: 'chats',   label: 'Chats',   icon: '💬' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

export default function Volunteer({ user, onLogout }) {
  const [tab, setTab]             = useState('map');
  const [incidents, setIncidents] = useState([]);
  const [userCoords, setCoords]   = useState(null);
  const [highlightId, setHL]      = useState(null);
  const [selectedInc, setSelInc]  = useState(null);
  const [matching, setMatching]   = useState(false);
  const [chatPartner, setCP]      = useState(null);
  const allUsers = getAllUsers().filter(u => u.id !== user.id);

  useEffect(() => {
    // Simulate coordinates near Hyderabad
    setCoords([17.395, 17.490]);
    navigator.geolocation?.getCurrentPosition(
      pos => setCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {} // silently use default
    );
    return incidentStore.subscribe(setIncidents);
  }, []);

  async function findAIMatch() {
    if (!userCoords) { toast('Location unavailable', 'error'); return; }
    setMatching(true);
    await new Promise(r => setTimeout(r, 1200)); // simulate AI thinking
    const available = incidents.filter(i => i.priority >= 7 && !i.assignedTo && i.lat);
    if (!available.length) {
      toast('No high-priority unassigned tasks nearby', 'warning');
      setMatching(false);
      return;
    }
    let best = null, bestDist = Infinity;
    available.forEach(inc => {
      const d = haversine(userCoords[0], userCoords[1], inc.lat, inc.lng);
      if (d < bestDist) { bestDist = d; best = inc; }
    });
    setHL(best.id);
    setSelInc(best);
    toast(`Best match found — ${best.category} (${bestDist.toFixed(1)} km away)`, 'success');
    setMatching(false);
  }

  function acceptTask(inc) {
    incidentStore.assign(inc.id, user.id, user.name);
    setSelInc(null);
    setHL(null);
    toast('Task accepted! Stay safe 🫡', 'success');
  }

  const chatId = chatPartner ? chatStore.getChatId(user.id, chatPartner.id) : null;

  const myTasks    = incidents.filter(i => i.assignedTo === user.id);
  const userRecord = { tasksCompleted: user.tasksCompleted || 0, helpHours: user.helpHours || 0 };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] pb-28">
      <AppHeader user={user} onLogout={onLogout} roleLabel="Volunteer" roleColor="#60a5fa" />

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* ── MAP TAB ──────────────────────────────────────── */}
        {tab === 'map' && (
          <div className="animate-fade-up">
            {/* Legend */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-display font-extrabold">Task Map</h1>
              <div className="flex gap-3">
                {[['high','#f87171','High'],['medium','#facc15','Med'],['low','#60a5fa','Low']].map(([l,c,label]) => (
                  <span key={l} className="flex items-center gap-1.5 text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <IncidentMap
              incidents={incidents}
              userCoords={userCoords}
              highlightId={highlightId}
              onPinClick={setSelInc}
              height={380}
            />

            {/* AI Match button */}
            <button onClick={findAIMatch} disabled={matching}
              className="mt-4 w-full rounded-2xl py-3.5 font-display font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-98"
              style={{
                background: matching ? 'rgba(251,146,60,0.15)' : 'linear-gradient(135deg, #fb923c, #ea580c)',
                boxShadow: matching ? 'none' : '0 4px 20px rgba(251,146,60,0.35)',
                color: matching ? '#fb923c' : '#7c2d12',
                border: matching ? '1px solid rgba(251,146,60,0.3)' : 'none',
              }}>
              {matching ? (
                <><Spinner size={16} color="#fb923c" /> AI scanning for best task...</>
              ) : (
                <>🤖 AI Match — Find My Best Task</>
              )}
            </button>

            {/* Selected incident card */}
            {selectedInc && (
              <div className="mt-4 glass-lit rounded-2xl p-5 animate-fade-up">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl mt-0.5"><CategoryIcon category={selectedInc.category} /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-display font-bold">{selectedInc.category}</span>
                      <PriorityBadge priority={selectedInc.priority} />
                    </div>
                    <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {selectedInc.autoSummary || selectedInc.description}
                    </p>
                    {selectedInc.lat && userCoords && (
                      <p className="text-xs font-body mt-2" style={{ color: '#fb923c' }}>
                        📍 {haversine(userCoords[0], userCoords[1], selectedInc.lat, selectedInc.lng).toFixed(1)} km away
                      </p>
                    )}
                  </div>
                  <button onClick={() => { setSelInc(null); setHL(null); }}
                    className="text-sm w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all"
                    style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>

                {selectedInc.assignedTo ? (
                  <div className="text-center py-2 text-sm font-body" style={{ color: '#4ade80' }}>
                    ✓ Already assigned to {selectedInc.assignedName}
                  </div>
                ) : (
                  <button onClick={() => acceptTask(selectedInc)}
                    className="w-full py-2.5 rounded-xl font-display font-bold text-sm transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#7c2d12', boxShadow: '0 4px 16px #fb923c33' }}>
                    ✓ Accept This Task
                  </button>
                )}
              </div>
            )}

            {/* My assigned tasks */}
            {myTasks.length > 0 && (
              <div className="mt-6">
                <h2 className="font-display font-bold mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>MY ASSIGNMENTS</h2>
                <div className="space-y-2">
                  {myTasks.map(t => (
                    <div key={t.id} className="glass rounded-xl p-3.5 flex items-center gap-3">
                      <CategoryIcon category={t.category} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-semibold">{t.category}</p>
                        <p className="text-xs font-body truncate" style={{ color: 'var(--text-muted)' }}>{t.autoSummary}</p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHATS TAB ────────────────────────────────────── */}
        {tab === 'chats' && (
          <div className="animate-fade-up">
            <h1 className="text-xl font-display font-extrabold mb-5">Messages</h1>
            <div className="grid grid-cols-5 gap-4" style={{ height: 520 }}>
              {/* People */}
              <div className="col-span-2 glass rounded-2xl overflow-hidden flex flex-col">
                <div className="px-3 py-3 border-b border-white/7">
                  <p className="text-xs font-body uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Contacts</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {allUsers.map(u => (
                    <button key={u.id} onClick={() => setCP(u)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all border ${
                        chatPartner?.id === u.id
                          ? 'bg-[#fb923c18] border-[#fb923c33]'
                          : 'border-transparent hover:bg-white/5'
                      }`}>
                      <Avatar initials={u.avatar || u.name[0]} color={u.color || '#fb923c'} size={28} />
                      <div className="min-w-0">
                        <p className="text-xs font-body font-semibold truncate">{u.name}</p>
                        <p className="text-xs font-body capitalize" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Chat */}
              <div className="col-span-3 glass rounded-2xl overflow-hidden flex flex-col">
                {chatPartner && (
                  <div className="px-4 py-3 border-b border-white/7 flex items-center gap-2.5">
                    <Avatar initials={chatPartner.avatar || chatPartner.name[0]} color={chatPartner.color} size={28} />
                    <p className="text-sm font-body font-semibold">{chatPartner.name}</p>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <InlineChat chatId={chatId} currentUser={user} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ──────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="animate-fade-up">
            <h1 className="text-xl font-display font-extrabold mb-6">My Profile</h1>

            {/* Hero card */}
            <div className="glass-lit rounded-2xl p-6 mb-5 flex items-center gap-5 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5"
                style={{ background: `radial-gradient(circle at 80% 50%, ${user.color || '#60a5fa'}, transparent)` }} />
              <Avatar initials={user.avatar || user.name[0]} color={user.color || '#60a5fa'} size={64}
                className="border-2 rounded-2xl" />
              <div>
                <p className="text-xl font-display font-extrabold">{user.name}</p>
                <p className="text-sm font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                  🙋 Volunteer · {user.skill || 'General'}
                </span>
              </div>
            </div>

            {/* Impact stats */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <StatCard
                label="Total Impact"
                value={myTasks.length || userRecord.tasksCompleted}
                sub="Tasks completed"
                icon="🏆"
                color="#fb923c"
                delay={0}
              />
              <StatCard
                label="Help Hours"
                value={`${userRecord.helpHours}h`}
                sub="Time volunteered"
                icon="⏱️"
                color="#4ade80"
                delay={50}
              />
            </div>

            {/* Activity breakdown */}
            <div className="glass rounded-2xl p-5 mb-4">
              <h3 className="font-display font-bold mb-4 text-sm">Recent Activity</h3>
              <div className="space-y-3">
                {myTasks.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm glass shrink-0">
                      <CategoryIcon category={t.category} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-medium truncate">{t.category}</p>
                      <p className="text-xs font-body truncate" style={{ color: 'var(--text-muted)' }}>{t.autoSummary}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
                {myTasks.length === 0 && (
                  <p className="text-sm font-body text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    No tasks yet — accept a task from the map!
                  </p>
                )}
              </div>
            </div>

            {/* Priority distribution mini chart */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-bold mb-4 text-sm">Platform Overview</h3>
              <div className="space-y-3">
                {[
                  { label: 'High Priority', count: incidents.filter(i=>i.priority>=7).length, color: '#f87171', total: incidents.length },
                  { label: 'Medium Priority', count: incidents.filter(i=>i.priority>=4&&i.priority<7).length, color: '#facc15', total: incidents.length },
                  { label: 'Low Priority', count: incidents.filter(i=>i.priority<4).length, color: '#60a5fa', total: incidents.length },
                ].map(({ label, count, color, total }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-body mb-1.5">
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ color }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: total ? `${(count/total)*100}%` : '0%', background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Bottom Nav ───────────────────────────── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <div className="glass rounded-2xl p-1.5 flex gap-1 shadow-2xl"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)' }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`flex flex-col items-center gap-1 px-6 py-2.5 rounded-xl text-xs font-body font-medium transition-all duration-200 ${
                tab === n.key
                  ? 'text-zinc-900'
                  : 'hover:bg-white/5'
              }`}
              style={tab === n.key ? {
                background: 'linear-gradient(135deg,#fb923c,#ea580c)',
                boxShadow: '0 2px 12px #fb923c44',
                color: '#7c2d12',
              } : { color: 'var(--text-muted)' }}>
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
