// src/store.js
// ──────────────────────────────────────────────────────────
// Sahaya — In-memory + localStorage data store
// Mimics Firestore with subscribe/publish pattern
// ──────────────────────────────────────────────────────────

// ── Seed data ──────────────────────────────────────────────
const SEED_INCIDENTS = [
  {
    id: 'inc-001',
    category: 'Flood',
    description: 'Rising water levels near the river bank. 40+ families stranded.',
    autoSummary: 'Severe flooding near riverside colony with families needing evacuation and emergency supplies.',
    priority: 9,
    status: 'Reported',
    reportedBy: 'user-001',
    reporterName: 'Sneha Iyer',
    assignedTo: null,
    assignedName: null,
    lat: 17.385,
    lng: 78.486,
    imageUrl: null,
    createdAt: Date.now() - 3600000,
    timeline: [{ status: 'Reported', ts: Date.now() - 3600000 }],
  },
  {
    id: 'inc-002',
    category: 'Medical',
    description: 'Multiple people injured after building collapse. Medical aid urgently needed.',
    autoSummary: 'Building collapse with multiple casualties requiring immediate medical attention.',
    priority: 10,
    status: 'Assigned',
    reportedBy: 'user-001',
    reporterName: 'Sneha Iyer',
    assignedTo: 'vol-001',
    assignedName: 'Arjun Sharma',
    lat: 17.432,
    lng: 78.501,
    imageUrl: null,
    createdAt: Date.now() - 7200000,
    timeline: [
      { status: 'Reported', ts: Date.now() - 7200000 },
      { status: 'Assigned', ts: Date.now() - 5400000 },
    ],
  },
  {
    id: 'inc-003',
    category: 'Food',
    description: 'Community shelter running out of food supplies for 200 displaced persons.',
    autoSummary: 'Food shortage at emergency shelter requiring supply delivery within 24 hours.',
    priority: 6,
    status: 'In Progress',
    reportedBy: 'user-002',
    reporterName: 'Mohan Das',
    assignedTo: 'vol-002',
    assignedName: 'Kavya Reddy',
    lat: 17.358,
    lng: 78.474,
    imageUrl: null,
    createdAt: Date.now() - 10800000,
    timeline: [
      { status: 'Reported', ts: Date.now() - 10800000 },
      { status: 'Assigned', ts: Date.now() - 9000000 },
      { status: 'In Progress', ts: Date.now() - 3600000 },
    ],
  },
  {
    id: 'inc-004',
    category: 'Rescue',
    description: 'Elderly person trapped in upper floor, mobility issues.',
    autoSummary: 'Elderly individual requires physical rescue assistance from upper floor.',
    priority: 7,
    status: 'Reported',
    reportedBy: 'user-002',
    reporterName: 'Mohan Das',
    assignedTo: null,
    assignedName: null,
    lat: 17.41,
    lng: 78.512,
    imageUrl: null,
    createdAt: Date.now() - 1800000,
    timeline: [{ status: 'Reported', ts: Date.now() - 1800000 }],
  },
  {
    id: 'inc-005',
    category: 'Shelter',
    description: 'Temporary shelter needed for 15 displaced families.',
    autoSummary: 'Families displaced from homes need temporary accommodation arrangements.',
    priority: 4,
    status: 'Resolved',
    reportedBy: 'user-001',
    reporterName: 'Sneha Iyer',
    assignedTo: 'vol-003',
    assignedName: 'Rishi Nair',
    lat: 17.37,
    lng: 78.46,
    imageUrl: null,
    createdAt: Date.now() - 86400000,
    timeline: [
      { status: 'Reported',    ts: Date.now() - 86400000 },
      { status: 'Assigned',    ts: Date.now() - 79200000 },
      { status: 'In Progress', ts: Date.now() - 43200000 },
      { status: 'Resolved',    ts: Date.now() - 7200000  },
    ],
  },
];

const SEED_MESSAGES = {
  // chatId = sorted userId1 + '_' + userId2
};

// ── Internal state ─────────────────────────────────────────
let _incidents  = loadOrSeed('sahaya_incidents', SEED_INCIDENTS);
let _messages   = loadOrSeed('sahaya_messages',  SEED_MESSAGES);
let _volunteers = loadOrSeed('sahaya_volunteers', [
  { id: 'vol-001', name: 'Arjun Sharma',  skill: 'Medical',   tasksCompleted: 12, helpHours: 34, reported: false, color: '#60a5fa', avatar: 'AS' },
  { id: 'vol-002', name: 'Kavya Reddy',   skill: 'Logistics', tasksCompleted: 8,  helpHours: 22, reported: false, color: '#4ade80', avatar: 'KR' },
  { id: 'vol-003', name: 'Rishi Nair',    skill: 'Rescue',    tasksCompleted: 5,  helpHours: 15, reported: false, color: '#c084fc', avatar: 'RN' },
]);

const _listeners = { incidents: [], messages: {}, volunteers: [] };

function loadOrSeed(key, seed) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  localStorage.setItem(key, JSON.stringify(seed));
  return Array.isArray(seed) ? [...seed] : { ...seed };
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function notify(channel, data) {
  (_listeners[channel] || []).forEach(fn => fn(data));
}

// ── Incidents API ──────────────────────────────────────────
export const incidentStore = {
  getAll: () => [..._incidents].sort((a, b) => b.createdAt - a.createdAt),
  getBy: (uid) => _incidents.filter(i => i.reportedBy === uid).sort((a, b) => b.createdAt - a.createdAt),

  add(incident) {
    const newInc = {
      id: 'inc-' + Date.now(),
      createdAt: Date.now(),
      timeline: [{ status: 'Reported', ts: Date.now() }],
      ...incident,
    };
    _incidents = [newInc, ..._incidents];
    persist('sahaya_incidents', _incidents);
    notify('incidents', _incidents);
    return newInc;
  },

  update(id, patch) {
    _incidents = _incidents.map(i => i.id === id ? { ...i, ...patch } : i);
    persist('sahaya_incidents', _incidents);
    notify('incidents', _incidents);
  },

  assign(id, userId, userName) {
    const inc = _incidents.find(i => i.id === id);
    if (!inc) return;
    const newTimeline = [...(inc.timeline || []), { status: 'Assigned', ts: Date.now() }];
    incidentStore.update(id, {
      status: 'Assigned',
      assignedTo: userId,
      assignedName: userName,
      timeline: newTimeline,
    });
  },

  subscribe(fn) {
    _listeners.incidents.push(fn);
    fn([..._incidents]);
    return () => { _listeners.incidents = _listeners.incidents.filter(f => f !== fn); };
  },
};

// ── Chat / Messages API ────────────────────────────────────
export const chatStore = {
  getChatId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
  },

  getMessages(chatId) {
    return (_messages[chatId] || []).sort((a, b) => a.ts - b.ts);
  },

  send(chatId, senderId, senderName, senderAvatar, text) {
    const msg = {
      id: 'msg-' + Date.now() + Math.random(),
      chatId, senderId, senderName, senderAvatar,
      text: text.trim(),
      ts: Date.now(),
    };
    _messages[chatId] = [...(_messages[chatId] || []), msg];
    persist('sahaya_messages', _messages);
    (_listeners.messages[chatId] || []).forEach(fn => fn([..._messages[chatId]]));
    return msg;
  },

  subscribe(chatId, fn) {
    if (!_listeners.messages[chatId]) _listeners.messages[chatId] = [];
    _listeners.messages[chatId].push(fn);
    fn([...(_messages[chatId] || [])]);
    return () => {
      _listeners.messages[chatId] = _listeners.messages[chatId].filter(f => f !== fn);
    };
  },
};

// ── Volunteers API ─────────────────────────────────────────
export const volunteerStore = {
  getAll: () => [..._volunteers],

  add(volunteer) {
    const newVol = {
      id: `vol-${Date.now()}`,
      name: volunteer.name,
      skill: volunteer.skill || 'General',
      color: volunteer.color || '#fb923c',
      avatar: volunteer.name[0].toUpperCase(),
      tasksCompleted: 0,
      helpHours: 0,
      reported: false,
      createdAt: Date.now(),
    };
    _volunteers = [..._volunteers, newVol];
    persist('sahaya_volunteers', _volunteers);
    notify('volunteers', _volunteers);
    return newVol;
  },

  delete(id) {
    _volunteers = _volunteers.filter(v => v.id !== id);
    persist('sahaya_volunteers', _volunteers);
    notify('volunteers', _volunteers);
  },

  toggleReport(id) {
    _volunteers = _volunteers.map(v => v.id === id ? { ...v, reported: !v.reported } : v);
    persist('sahaya_volunteers', _volunteers);
    notify('volunteers', _volunteers);
  },

  subscribe(fn) {
    _listeners.volunteers.push(fn);
    fn([..._volunteers]);
    return () => { _listeners.volunteers = _listeners.volunteers.filter(f => f !== fn); };
  },
};

// ── Haversine distance ─────────────────────────────────────
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
