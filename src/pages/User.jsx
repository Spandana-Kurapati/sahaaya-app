// src/pages/User.jsx
// ──────────────────────────────────────────────────────────
// Sahaya — Citizen / User Interface
// Incident Reporter + AI Analysis + Status Tracker
// ──────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { incidentStore } from '../store.js';
import { analyzeIncident } from '../gemini.js';
import {
  AppHeader, Avatar, PriorityBadge, StatusBadge, CategoryIcon,
  StatCard, Spinner, toast,
} from '../components/ui.jsx';

const CATEGORIES = ['Flood','Medical','Rescue','Food','Shelter','Fire','Infrastructure','Other'];

const TIMELINE_STEPS = ['Reported','Assigned','In Progress','Resolved'];
const STEP_ICONS = { Reported: '📋', Assigned: '👷', 'In Progress': '⚙️', Resolved: '✅' };
const STEP_DESC  = {
  Reported:    'Your report has been received and is pending review.',
  Assigned:    'A volunteer has been assigned to your incident.',
  'In Progress':'The volunteer is actively working on this incident.',
  Resolved:    'This incident has been successfully resolved.',
};

export default function User({ user, onLogout }) {
  const [tab, setTab]               = useState('report');
  const [myIncidents, setMyInc]     = useState([]);

  // Form state
  const [description, setDesc]      = useState('');
  const [category, setCategory]     = useState('');
  const [lat, setLat]               = useState('');
  const [lng, setLng]               = useState('');
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setPreview]  = useState(null);
  const [imageBase64, setB64]       = useState(null);
  const [dragOver, setDragOver]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult]     = useState(null);
  const fileInputRef                = useRef(null);

  useEffect(() => {
    // Try to get geolocation
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
      },
      () => {
        // Fallback: Hyderabad center
        setLat('17.38500');
        setLng('78.48600');
      }
    );
    // Subscribe to own incidents
    const unsub = incidentStore.subscribe(all => {
      setMyInc(all.filter(i => i.reportedBy === user.id)
                   .sort((a,b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, [user.id]);

  // ── Image handling ─────────────────────────────────────
  function processImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast('Please upload a valid image file', 'error');
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = ev => setB64(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processImageFile(file);
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  }

  function clearImage() {
    setImageFile(null);
    setPreview(null);
    setB64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Submit ─────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) { toast('Please describe the incident', 'error'); return; }

    setSubmitting(true);
    setAiResult(null);

    try {
      // Call Gemini
      const ai = await analyzeIncident(description, imageBase64);
      setAiResult(ai);

      // Save to store
      incidentStore.add({
        description:  description.trim(),
        category:     category || ai.category,
        autoSummary:  ai.autoSummary,
        priority:     ai.priority,
        status:       'Reported',
        reportedBy:   user.id,
        reporterName: user.name,
        assignedTo:   null,
        assignedName: null,
        lat:          parseFloat(lat) || null,
        lng:          parseFloat(lng) || null,
        imageUrl:     imagePreview || null,
      });

      toast('Incident reported successfully!', 'success');
      setDesc('');
      setCategory('');
      clearImage();
      setTab('track');
    } catch (err) {
      toast('Failed to submit: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────
  function stepIndex(status) {
    return TIMELINE_STEPS.indexOf(status);
  }

  const stats = {
    total:    myIncidents.length,
    active:   myIncidents.filter(i => i.status !== 'Resolved').length,
    resolved: myIncidents.filter(i => i.status === 'Resolved').length,
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)]">

      <AppHeader user={user} onLogout={onLogout} roleLabel="Citizen" roleColor="#f472b6">
        {/* Tab switcher */}
        <div className="glass rounded-xl p-1 flex gap-1">
          {[
            { key: 'report', label: '+ Report' },
            { key: 'track',  label: '📍 Track' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-all ${
                tab === t.key
                  ? 'text-zinc-900 font-bold'
                  : 'hover:bg-white/5'
              }`}
              style={tab === t.key ? {
                background: 'linear-gradient(135deg,#fb923c,#ea580c)',
                color: '#7c2d12',
              } : { color: 'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </AppHeader>

      <div className="max-w-xl mx-auto px-4 py-8">

        {/* ── REPORT TAB ──────────────────────────────────── */}
        {tab === 'report' && (
          <div className="animate-fade-up">
            <div className="mb-7">
              <h1 className="text-2xl font-display font-extrabold">Report an Incident</h1>
              <p className="text-sm font-body mt-1" style={{ color: 'var(--text-muted)' }}>
                AI will assess priority and route to the nearest volunteer
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Image drop zone ──────────────────────── */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => !imagePreview && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden
                  ${dragOver ? 'drag-over' : 'border-white/10 hover:border-white/20'}`}
                style={{ minHeight: imagePreview ? 'auto' : 140 }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />

                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Incident preview"
                      className="w-full max-h-52 object-cover rounded-xl"
                    />
                    {/* Overlay info */}
                    <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                      <span className="text-xs font-body text-white/80 truncate">{imageFile?.name}</span>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); clearImage(); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:bg-white/20"
                        style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-2xl">
                      📷
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-body font-medium" style={{ color: 'var(--text-primary)' }}>
                        Drag & drop an image
                      </p>
                      <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        or <span style={{ color: '#fb923c' }}>click to browse</span> — AI will analyze for severity
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Description ──────────────────────────── */}
              <div>
                <label className="block text-xs font-body mb-2 uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>
                  Incident Description *
                </label>
                <textarea
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  required
                  rows={4}
                  placeholder="Describe what happened, where, and how many people are affected..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-body text-white placeholder-white/20 resize-none
                    focus:outline-none focus:border-[#fb923c66] focus:ring-1 focus:ring-[#fb923c22] transition-all leading-relaxed"
                />
              </div>

              {/* ── Category ─────────────────────────────── */}
              <div>
                <label className="block text-xs font-body mb-2 uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>
                  Category <span style={{ color: 'var(--text-muted)' }}>(optional — AI will detect)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(cat => cat === c ? '' : c)}
                      className={`py-2 px-1 rounded-xl text-xs font-body font-medium transition-all border text-center ${
                        category === c
                          ? 'bg-[#fb923c18] border-[#fb923c55] text-[#fb923c]'
                          : 'border-white/7 text-[var(--text-muted)] hover:border-white/15 hover:text-white glass'
                      }`}>
                      <span className="block text-base mb-0.5">
                        {{'Flood':'🌊','Medical':'🏥','Rescue':'🚁','Food':'🍱','Shelter':'🏠','Fire':'🔥','Infrastructure':'🏗️','Other':'📋'}[c]}
                      </span>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Location ─────────────────────────────── */}
              <div>
                <label className="block text-xs font-body mb-2 uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>
                  Location Coordinates
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-body" style={{ color: 'var(--text-muted)' }}>Lat</span>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={e => setLat(e.target.value)}
                      placeholder="17.38500"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-body text-white placeholder-white/20
                        focus:outline-none focus:border-[#fb923c66] focus:ring-1 focus:ring-[#fb923c22] transition-all"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-body" style={{ color: 'var(--text-muted)' }}>Lng</span>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={e => setLng(e.target.value)}
                      placeholder="78.48600"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm font-body text-white placeholder-white/20
                        focus:outline-none focus:border-[#fb923c66] focus:ring-1 focus:ring-[#fb923c22] transition-all"
                    />
                  </div>
                </div>
                <p className="text-xs font-body mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  📍 Auto-filled from your device location
                </p>
              </div>

              {/* ── AI Result preview ─────────────────────── */}
              {aiResult && (
                <div className="glass-lit rounded-2xl p-4 animate-fade-up">
                  <p className="text-xs font-body uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>
                    🤖 AI Analysis Complete
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center glass rounded-xl p-3">
                      <p className="text-2xl font-display font-extrabold"
                        style={{ color: aiResult.priority >= 7 ? '#f87171' : aiResult.priority >= 4 ? '#facc15' : '#60a5fa' }}>
                        {aiResult.priority}
                        <span className="text-sm font-body font-normal" style={{ color: 'var(--text-muted)' }}>/10</span>
                      </p>
                      <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>Priority</p>
                    </div>
                    <div className="text-center glass rounded-xl p-3">
                      <p className="text-sm font-display font-bold">{aiResult.category}</p>
                      <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>Category</p>
                    </div>
                    <div className="text-center glass rounded-xl p-3">
                      <p className="text-sm font-bold" style={{ color: '#4ade80' }}>✓</p>
                      <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>Submitted</p>
                    </div>
                  </div>
                  <p className="text-xs font-body leading-relaxed p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                    {aiResult.autoSummary}
                  </p>
                </div>
              )}

              {/* ── Submit button ─────────────────────────── */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl py-4 font-display font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-98"
                style={{
                  background: submitting
                    ? 'rgba(251,146,60,0.15)'
                    : 'linear-gradient(135deg, #fb923c, #ea580c)',
                  boxShadow: submitting ? 'none' : '0 4px 24px rgba(251,146,60,0.4)',
                  color: submitting ? '#fb923c' : '#7c2d12',
                  border: submitting ? '1px solid rgba(251,146,60,0.3)' : 'none',
                }}>
                {submitting ? (
                  <><Spinner size={16} color="#fb923c" /> Analyzing with AI...</>
                ) : (
                  <>🚨 Submit Incident Report</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── TRACK TAB ───────────────────────────────────── */}
        {tab === 'track' && (
          <div className="animate-fade-up">
            <div className="mb-7">
              <h1 className="text-2xl font-display font-extrabold">My Reports</h1>
              <p className="text-sm font-body mt-1" style={{ color: 'var(--text-muted)' }}>
                Live status of all your submitted incidents
              </p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-7">
              <StatCard label="Total"    value={stats.total}    icon="📋" color="#fb923c" delay={0}   />
              <StatCard label="Active"   value={stats.active}   icon="⚡" color="#facc15" delay={50}  />
              <StatCard label="Resolved" value={stats.resolved} icon="✅" color="#4ade80" delay={100} />
            </div>

            {/* Incident list */}
            {myIncidents.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <p className="font-display font-bold mb-2">No reports yet</p>
                <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                  Submit an incident to see it tracked here.
                </p>
                <button
                  onClick={() => setTab('report')}
                  className="mt-5 px-5 py-2.5 rounded-xl text-sm font-body font-medium transition-all"
                  style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                  + Report an Incident
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myIncidents.map((inc, idx) => (
                  <IncidentCard key={inc.id} inc={inc} idx={idx} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Incident Card with vertical timeline ───────────────────
function IncidentCard({ inc, idx }) {
  const [expanded, setExpanded] = useState(idx === 0);
  const currentStep = TIMELINE_STEPS.indexOf(inc.status);

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 stagger-${Math.min(idx + 1, 5)}`}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/3 transition-all">

        {/* Category icon */}
        <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-xl shrink-0">
          <CategoryIcon category={inc.category} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-display font-bold">{inc.category}</span>
            <PriorityBadge priority={inc.priority} />
          </div>
          <p className="text-sm font-body leading-snug line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {inc.autoSummary || inc.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={inc.status} />
            {inc.assignedName && (
              <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                → {inc.assignedName}
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <span className="text-sm transition-transform duration-200 shrink-0"
          style={{
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
          ▾
        </span>
      </button>

      {/* Expanded: vertical timeline */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 animate-fade-up">

          {/* Image if any */}
          {inc.imageUrl && (
            <img
              src={inc.imageUrl}
              alt="Incident"
              className="w-full max-h-40 object-cover rounded-xl mb-4"
            />
          )}

          {/* Timeline */}
          <div className="relative pl-5">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 rounded-full"
              style={{ background: 'linear-gradient(to bottom, rgba(251,146,60,0.5), rgba(255,255,255,0.05))' }} />

            {TIMELINE_STEPS.map((step, i) => {
              const done    = i <= currentStep;
              const current = i === currentStep;
              return (
                <div key={step} className={`relative flex gap-3 mb-5 last:mb-0 transition-all ${done ? '' : 'opacity-30'}`}>
                  {/* Dot */}
                  <div className={`absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-all ${
                    current
                      ? 'border-[#fb923c] bg-[#fb923c] shadow-[0_0_8px_#fb923c88]'
                      : done
                      ? 'border-[#fb923c88] bg-[#fb923c44]'
                      : 'border-white/20 bg-transparent'
                  }`} />

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm">{STEP_ICONS[step]}</span>
                      <span className={`text-sm font-body font-semibold ${current ? 'text-[#fb923c]' : ''}`}
                        style={{ color: current ? '#fb923c' : done ? 'var(--text-primary)' : undefined }}>
                        {step}
                      </span>
                      {current && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium animate-pulse"
                          style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c' }}>
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-body leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {current || done ? STEP_DESC[step] : 'Pending...'}
                    </p>
                    {/* Timestamp from timeline array */}
                    {inc.timeline?.[i] && (
                      <p className="text-xs font-body mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {new Date(inc.timeline[i].ts).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Location */}
          {inc.lat && (
            <div className="mt-4 glass rounded-xl px-3 py-2 flex items-center gap-2">
              <span>📍</span>
              <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                {inc.lat.toFixed(4)}°N, {inc.lng.toFixed(4)}°E
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
