// src/pages/Admin.jsx
// ──────────────────────────────────────────────────────────
// Sahaya — Admin Interface
// Sidebar: Management | Incident Feed | Messages
// ──────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { logout, getAllUsers } from '../auth.js';
import { incidentStore, volunteerStore, chatStore, adminRequestStore } from '../store.js';
import IncidentMap from '../components/IncidentMap.jsx';
import {
  Avatar, PriorityBadge, StatusBadge, CategoryIcon,
  StatCard, InlineChat, ConfirmDialog, toast,
} from '../components/ui.jsx';

const NAV = [
  { key: 'management', label: 'Management',      icon: '⚙️' },
  { key: 'access',     label: 'Access Requests', icon: '🔐' },
  { key: 'incidents',  label: 'Incident Feed',  icon: '📍' },
  { key: 'messages',   label: 'Messages',       icon: '💬' },
];

export default function Admin({ user, onLogout }) {
  const [tab, setTab]             = useState('management');
  const [volunteers, setVols]     = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  const [chatPartner, setCP]      = useState(null);
  const [confirm, setConfirm]     = useState(null); // { message, onConfirm }
  const [showAddVol, setShowAddVol] = useState(false);
  const [newVolName, setNewVolName] = useState('');
  const [newVolSkill, setNewVolSkill] = useState('');

  useEffect(() => {
    const u1 = volunteerStore.subscribe(setVols);
    const u2 = incidentStore.subscribe(setIncidents);
    const u3 = adminRequestStore.subscribe(setAdminRequests);
    return () => { u1(); u2(); u3(); };
  }, []);

  function handleDelete(v) {
    setConfirm({
      message: `Remove ${v.name} from the volunteer list? This cannot be undone.`,
      onConfirm: () => {
        volunteerStore.delete(v.id);
        toast(`${v.name} removed`, 'success');
        setConfirm(null);
      },
    });
  }

  function handleReport(v) {
    if (v.reported) {
      volunteerStore.unreport(v.id);
      toast(`Flag removed from ${v.name}`, 'info');
    } else {
      volunteerStore.report(v.id);
      toast(`${v.name} flagged for review`, 'warning');
    }
  }

  function handleAddVolunteer() {
    if (!newVolName.trim()) return;
    volunteerStore.add({ name: newVolName.trim(), skill: newVolSkill.trim() });
    toast(`${newVolName.trim()} added as volunteer`, 'success');
    setNewVolName('');
    setNewVolSkill('');
    setShowAddVol(false);
  }

  function handleApproveAdminRequest(request) {
    adminRequestStore.approve(request.id, user.id, user.name);
    toast(`Admin access approved for ${request.userName}`, 'success');
  }

  function handleDenyAdminRequest(request) {
    adminRequestStore.deny(request.id, user.id, user.name);
    toast(`Admin access request from ${request.userName} denied`, 'info');
  }

  const allNonAdmins = getAllUsers().filter(u => u.id !== user.id);
  const chatId = chatPartner ? chatStore.getChatId(user.id, chatPartner.id) : null;

  const stats = {
    total:    incidents.length,
    high:     incidents.filter(i => i.priority >= 7).length,
    assigned: incidents.filter(i => i.assignedTo).length,
    resolved: incidents.filter(i => i.status === 'Resolved').length,
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] flex text-[var(--text-primary)]">
      {confirm && (
        <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="w-60 min-h-screen flex flex-col border-r border-white/7 bg-[var(--bg-surface)]">
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)', boxShadow: '0 4px 12px #fb923c33' }}>
              🤝
            </div>
            <div>
              <p className="font-display font-bold text-base leading-none">Sahaya</p>
              <p className="text-xs font-body mt-0.5" style={{ color: '#fb923c' }}>Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all text-left ${
                tab === n.key
                  ? 'bg-[#fb923c18] text-[#fb923c] border border-[#fb923c33]'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5 border border-transparent'
              }`}>
              <span className="text-base">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-white/5">
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <Avatar initials={user.avatar || user.name[0]} color={user.color} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body font-semibold truncate">{user.name}</p>
              <p className="text-xs font-body truncate" style={{ color: 'var(--text-muted)' }}>Admin</p>
            </div>
          </div>
          <button onClick={() => { logout(); onLogout(); }}
            className="mt-2 w-full text-xs font-body text-center py-2 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-400"
            style={{ color: 'var(--text-muted)' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="flex-1 p-7 overflow-auto">

        {/* ── MANAGEMENT TAB ──────────────────────────────── */}
        {tab === 'management' && (
          <div className="animate-fade-up">
            <div className="flex items-start justify-between mb-7">
              <div>
                <h1 className="text-2xl font-display font-extrabold">Volunteer Management</h1>
                <p className="text-sm font-body mt-1" style={{ color: 'var(--text-muted)' }}>
                  {volunteers.length} active volunteers across all zones
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="glass rounded-xl px-4 py-2 text-xs font-body" style={{ color: '#fb923c' }}>
                  {incidents.filter(i => !i.assignedTo && i.status === 'Reported').length} unassigned incidents
                </div>
                <button
                  onClick={() => setShowAddVol(!showAddVol)}
                  className="text-sm font-body font-semibold px-4 py-2 rounded-xl transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff', boxShadow: '0 4px 12px #fb923c44' }}
                >
                  + Add Volunteer
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mb-7">
              <StatCard label="Total Incidents" value={stats.total}    icon="📋" color="#fb923c" delay={0}   />
              <StatCard label="High Priority"   value={stats.high}     icon="🔴" color="#f87171" delay={50}  />
              <StatCard label="Assigned"        value={stats.assigned} icon="👷" color="#60a5fa" delay={100} />
              <StatCard label="Resolved"        value={stats.resolved} icon="✅" color="#4ade80" delay={150} />
            </div>

            {/* Add volunteer form */}
            {showAddVol && (
              <div className="glass-lit rounded-2xl p-5 mb-6 animate-fade-up">
                <h3 className="font-display font-bold mb-4 text-base">Add New Volunteer</h3>
                <div className="flex gap-3 flex-wrap">
                  <input
                    value={newVolName}
                    onChange={e => setNewVolName(e.target.value)}
                    placeholder="Full Name *"
                    className="flex-1 min-w-40 glass rounded-xl px-4 py-2.5 text-sm font-body outline-none focus:border-[#fb923c] transition-colors"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'transparent' }}
                    onKeyDown={e => e.key === 'Enter' && handleAddVolunteer()}
                  />
                  <input
                    value={newVolSkill}
                    onChange={e => setNewVolSkill(e.target.value)}
                    placeholder="Skill (e.g. Medical, Rescue)"
                    className="flex-1 min-w-40 glass rounded-xl px-4 py-2.5 text-sm font-body outline-none focus:border-[#fb923c] transition-colors"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'transparent' }}
                    onKeyDown={e => e.key === 'Enter' && handleAddVolunteer()}
                  />
                  <button
                    onClick={handleAddVolunteer}
                    disabled={!newVolName.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-body font-semibold transition-all hover:scale-105 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff' }}
                  >
                    Add Volunteer
                  </button>
                  <button
                    onClick={() => setShowAddVol(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-body font-semibold transition-all hover:bg-white/8"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Volunteer table */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/7 flex items-center justify-between">
                <h2 className="font-display font-bold">Volunteer Roster</h2>
                <span className="text-xs font-body px-2.5 py-1 rounded-full glass" style={{ color: 'var(--text-muted)' }}>
                  {volunteers.length} members
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Volunteer', 'Skill', 'Tasks Done', 'Help Hours', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium"
                          style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {volunteers.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        No volunteers registered yet.
                      </td></tr>
                    )}
                    {volunteers.map(v => (
                      <tr key={v.id} className="hover:bg-white/3 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar initials={v.avatar || v.name[0]} color={v.color || '#fb923c'} size={32} />
                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">{v.name}</p>
                              {v.reported && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                                  ⚑ Flagged
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="glass px-2.5 py-1 rounded-full text-xs" style={{ color: 'var(--text-primary)' }}>
                            {v.skill || 'General'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold" style={{ color: '#fb923c' }}>{v.tasksCompleted || 0}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold" style={{ color: '#4ade80' }}>{v.helpHours || 0}h</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                            Active
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <button onClick={() => handleReport(v)}
                              className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${
                                v.reported
                                  ? 'bg-orange-500/10 border-orange-400/20 text-orange-300 hover:bg-orange-500/20'
                                  : 'bg-yellow-500/10 border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20'
                              }`}>
                              {v.reported ? 'Unflag' : 'Report'}
                            </button>
                            <button onClick={() => handleDelete(v)}
                              className="text-xs px-3 py-1.5 rounded-xl border bg-red-500/10 border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all font-medium">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ACCESS REQUESTS TAB ─────────────────────────── */}
        {tab === 'access' && (
          <div className="animate-fade-up">
            <div>
              <h1 className="text-2xl font-display font-extrabold mb-2">Admin Access Requests</h1>
              <p className="text-sm font-body mb-6" style={{ color: 'var(--text-muted)' }}>
                Review and approve requests for admin platform access
              </p>
            </div>

            {/* Pending requests */}
            <div className="mb-8">
              <h2 className="font-display font-bold mb-4 flex items-center gap-2">
                <span>🔄 Pending Requests</span>
                {adminRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full glass" style={{ background: '#fb923c22', color: '#fb923c' }}>
                    {adminRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </h2>
              {adminRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                    No pending admin access requests
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {adminRequests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} className="glass rounded-2xl p-5 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-display font-semibold text-base">{req.userName}</p>
                          <code className="text-xs px-2.5 py-1 rounded-lg glass" style={{ color: 'var(--text-muted)' }}>
                            {req.userEmail}
                          </code>
                        </div>
                        {req.reason && (
                          <p className="text-sm font-body mb-3" style={{ color: 'var(--text-muted)' }}>
                            {req.reason}
                          </p>
                        )}
                        <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                          Requested {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApproveAdminRequest(req)}
                          className="px-4 py-2 rounded-xl text-sm font-body font-semibold transition-all hover:scale-105"
                          style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#fff' }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleDenyAdminRequest(req)}
                          className="px-4 py-2 rounded-xl text-sm font-body font-semibold transition-all hover:scale-105 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        >
                          ✕ Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approval history */}
            {adminRequests.filter(r => r.status !== 'pending').length > 0 && (
              <div>
                <h2 className="font-display font-bold mb-4">📋 History</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {adminRequests.filter(r => r.status !== 'pending').map(req => (
                    <div key={req.id} className="glass rounded-xl p-3 flex items-center justify-between text-sm font-body">
                      <div className="flex-1">
                        <span className="font-semibold">{req.userName}</span>
                        <span style={{ color: 'var(--text-muted)' }}> · {req.userEmail}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(req.decidedAt).toLocaleDateString()}
                        </span>
                        {req.status === 'approved' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                            ✕ Denied
                          </span>
                        )}
                        <span style={{ color: 'var(--text-muted)' }}>by {req.decidedByName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── INCIDENT FEED TAB ────────────────────────────── */}
        {tab === 'incidents' && (
          <div className="animate-fade-up">
            <h1 className="text-2xl font-display font-extrabold mb-7">Incident Map — Global View</h1>
            <IncidentMap incidents={incidents} height={420} />
            <div className="mt-5 space-y-3">
              <h2 className="font-display font-bold mb-3">All Incidents</h2>
              {incidents.map(inc => (
                <div key={inc.id} className="glass rounded-2xl p-4 flex items-start gap-4 hover:bg-white/5 transition-all">
                  <div className="text-2xl mt-0.5"><CategoryIcon category={inc.category} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="font-display font-semibold">{inc.category}</span>
                      <PriorityBadge priority={inc.priority} />
                      <StatusBadge status={inc.status} />
                    </div>
                    <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {inc.autoSummary || inc.description}
                    </p>
                    <p className="text-xs font-body mt-2" style={{ color: 'var(--text-muted)' }}>
                      Reported by {inc.reporterName}
                      {inc.assignedName ? ` · Assigned to ${inc.assignedName}` : ''}
                      {inc.lat ? ` · ${inc.lat.toFixed(3)}°N ${inc.lng.toFixed(3)}°E` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB ─────────────────────────────────── */}
        {tab === 'messages' && (
          <div className="animate-fade-up">
            <h1 className="text-2xl font-display font-extrabold mb-7">Chat Portal</h1>
            <div className="grid grid-cols-5 gap-5" style={{ height: 540 }}>
              {/* People list */}
              <div className="col-span-2 glass rounded-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-white/7">
                  <p className="text-xs font-body uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Volunteers & Users
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {allNonAdmins.map(u => (
                    <button key={u.id} onClick={() => setCP(u)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                        chatPartner?.id === u.id
                          ? 'bg-[#fb923c18] border-[#fb923c33]'
                          : 'border-transparent hover:bg-white/5'
                      }`}>
                      <Avatar initials={u.avatar || u.name[0]} color={u.color || '#fb923c'} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-semibold truncate">{u.name}</p>
                        <p className="text-xs font-body capitalize" style={{ color: 'var(--text-muted)' }}>{u.role}</p>
                      </div>
                      {chatPartner?.id === u.id && <span style={{ color: '#fb923c' }}>●</span>}
                    </button>
                  ))}
                </div>
              </div>
              {/* Chat window */}
              <div className="col-span-3 glass rounded-2xl overflow-hidden flex flex-col">
                {chatPartner && (
                  <div className="px-4 py-3 border-b border-white/7 flex items-center gap-3">
                    <Avatar initials={chatPartner.avatar || chatPartner.name[0]} color={chatPartner.color} size={30} />
                    <div>
                      <p className="text-sm font-body font-semibold">{chatPartner.name}</p>
                      <p className="text-xs font-body capitalize" style={{ color: 'var(--text-muted)' }}>{chatPartner.role}</p>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <InlineChat chatId={chatId} currentUser={user} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
