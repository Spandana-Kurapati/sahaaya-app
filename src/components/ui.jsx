// src/components/ui.jsx
// ──────────────────────────────────────────────────────────
// Sahaya — Shared design-system components
// ──────────────────────────────────────────────────────────
import { useState } from 'react';

// ── Avatar ─────────────────────────────────────────────────
export function Avatar({ initials, color = '#fb923c', size = 36, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl font-display font-bold shrink-0 ${className}`}
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: color + '22',
        border: `1.5px solid ${color}44`,
        color,
      }}
    >
      {initials}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const level = priority >= 7 ? 'high' : priority >= 4 ? 'medium' : 'low';
  const labels = { high: '🔴 High', medium: '🟡 Medium', low: '🔵 Low' };
  return (
    <span className={`badge-${level} text-xs px-2 py-0.5 rounded-full font-medium font-body`}>
      {labels[level]} · P{priority}
    </span>
  );
}

// ── Status badge ───────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    'Reported':    { bg: 'rgba(251,146,60,0.15)',  color: '#fb923c', dot: '#fb923c' },
    'Assigned':    { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', dot: '#60a5fa' },
    'In Progress': { bg: 'rgba(250,204,21,0.15)',  color: '#facc15', dot: '#facc15' },
    'Resolved':    { bg: 'rgba(74,222,128,0.15)',  color: '#4ade80', dot: '#4ade80' },
  };
  const s = map[status] || map['Reported'];
  return (
    <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

// ── Category icon ──────────────────────────────────────────
export function CategoryIcon({ category }) {
  const icons = {
    Flood: '🌊', Medical: '🏥', Rescue: '🚁', Food: '🍱',
    Shelter: '🏠', Fire: '🔥', Infrastructure: '🏗️', Other: '📋',
  };
  return <span>{icons[category] || '📋'}</span>;
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner({ size = 20, color = '#fb923c' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Toast ──────────────────────────────────────────────────
let _toastFn = null;
export function setToastFn(fn) { _toastFn = fn; }
export function toast(msg, type = 'info') { _toastFn && _toastFn(msg, type); }

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  setToastFn((msg, type) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  });
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const colors = { success: '#4ade80', error: '#f87171', info: '#60a5fa', warning: '#facc15' };
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className="glass flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-body animate-fade-up shadow-2xl pointer-events-auto"
          style={{ borderColor: colors[t.type] + '44', color: '#f5f4f0' }}>
          <span style={{ color: colors[t.type] }}>{icons[t.type]}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Confirm dialog ─────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-up">
        <p className="text-sm font-body text-[var(--text-muted)] mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30 transition-all">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────
export function StatCard({ label, value, sub, color = '#fb923c', icon, delay = 0 }) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden"
      style={{ animationDelay: `${delay}ms`, animation: 'fadeUp 0.5s ease both' }}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"
        style={{ background: color + '18' }} />
      {icon && <div className="text-2xl mb-3">{icon}</div>}
      <p className="text-xs font-body uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-3xl font-display font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Inline Chat ────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { chatStore } from '../store.js';

export function InlineChat({ chatId, currentUser }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;
    return chatStore.subscribe(chatId, setMsgs);
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  function send() {
    if (!text.trim()) return;
    chatStore.send(chatId, currentUser.id, currentUser.name, currentUser.avatar, text);
    setText('');
  }

  if (!chatId) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>← Select a conversation</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 pr-2">
        {msgs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>No messages yet. Say hello!</p>
          </div>
        )}
        {msgs.map(m => {
          const isSelf = m.senderId === currentUser.id;
          return (
            <div key={m.id} className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0"
                style={{ background: '#fb923c22', color: '#fb923c', border: '1px solid #fb923c33' }}>
                {m.senderAvatar}
              </div>
              <div className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm font-body leading-snug ${
                isSelf ? 'bubble-self bg-[#fb923c] text-zinc-900 font-medium' : 'bubble-other glass text-[var(--text-primary)]'
              }`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <div className="p-3 border-t border-white/5 flex gap-2">
        <input
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-body text-white placeholder-white/20 focus:outline-none focus:border-[#fb923c44] focus:ring-1 focus:ring-[#fb923c22] transition-all"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
        />
        <button onClick={send}
          className="w-9 h-9 rounded-xl bg-[#fb923c] text-zinc-900 font-bold text-sm shrink-0 flex items-center justify-center hover:bg-[#fdba74] transition-all active:scale-95">
          ↑
        </button>
      </div>
    </div>
  );
}
