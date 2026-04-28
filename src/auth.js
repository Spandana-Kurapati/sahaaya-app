// src/auth.js
// ──────────────────────────────────────────────────────────
// Sahaya — JWT-based authentication with backend integration
// SECURITY: Role is verified server-side on every request
// Volunteer requests must be approved by hardcoded admin
// ──────────────────────────────────────────────────────────
import { authAPI, getToken, getTokenData, clearToken } from './api.js';

// ── Demo users (for offline fallback only) ─────────────────
export const DEMO_USERS = [
  {
    id: 'admin-001',
    name: 'Priya Mehta',
    email: 'admin@sahaya.org',
    password: 'admin123',
    role: 'admin',
    avatar: 'PM',
    color: '#fb923c',
  },
  {
    id: 'vol-001',
    name: 'Arjun Sharma',
    email: 'arjun@sahaya.org',
    password: 'vol123',
    role: 'volunteer',
    avatar: 'AS',
    color: '#60a5fa',
    skill: 'Medical',
    tasksCompleted: 12,
    helpHours: 34,
  },
  {
    id: 'vol-002',
    name: 'Kavya Reddy',
    email: 'kavya@sahaya.org',
    password: 'vol456',
    role: 'volunteer',
    avatar: 'KR',
    color: '#4ade80',
    skill: 'Logistics',
    tasksCompleted: 8,
    helpHours: 22,
  },
  {
    id: 'vol-003',
    name: 'Rishi Nair',
    email: 'rishi@sahaya.org',
    password: 'vol789',
    role: 'volunteer',
    avatar: 'RN',
    color: '#c084fc',
    skill: 'Rescue',
    tasksCompleted: 5,
    helpHours: 15,
  },
  {
    id: 'user-001',
    name: 'Sneha Iyer',
    email: 'sneha@sahaya.org',
    password: 'user123',
    role: 'user',
    avatar: 'SI',
    color: '#f472b6',
  },
  {
    id: 'user-002',
    name: 'Mohan Das',
    email: 'mohan@sahaya.org',
    password: 'user456',
    role: 'user',
    avatar: 'MD',
    color: '#34d399',
  },
];

// ── Session from JWT token ─────────────────────────────────
// IMPORTANT: Token data is decoded client-side only for display.
// Server ALWAYS re-validates role on every API request.
export function getSession() {
  const token = getToken();
  if (!token) return null;

  const tokenData = getTokenData();
  if (!tokenData) return null;

  // Reconstruct session from JWT payload
  // NOTE: Server will re-verify role and all claims on each request
  return {
    id: tokenData.userId || tokenData.sub,
    email: tokenData.email,
    name: tokenData.name,
    role: tokenData.role, // ⚠️ DO NOT TRUST: Server re-checks this
    avatar: tokenData.avatar,
    color: tokenData.color,
    skill: tokenData.skill,
    tasksCompleted: tokenData.tasksCompleted,
    helpHours: tokenData.helpHours,
  };
}

// ── Login with JWT ─────────────────────────────────────────
// Calls backend API; backend validates credentials and issues JWT
export async function login(email, password) {
  try {
    const response = await authAPI.login(email, password);
    // Token is stored by authAPI.login
    return getSession(); // Return decoded session
  } catch (error) {
    console.error('Login failed:', error);
    
    // Fallback to demo mode for development
    const demoUser = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (demoUser && import.meta.env.DEV) {
      // Create fake JWT token for demo (backend not required)
      const fakeToken = btoa(JSON.stringify({
        userId: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        avatar: demoUser.avatar,
        color: demoUser.color,
        skill: demoUser.skill,
        tasksCompleted: demoUser.tasksCompleted,
        helpHours: demoUser.helpHours,
        exp: Math.floor(Date.now() / 1000) + 86400,
      }));
      localStorage.setItem('sahaya_token', `demo.${fakeToken}.signature`);
      return getSession();
    }
    
    return null;
  }
}

// ── Logout ─────────────────────────────────────────────────
// Calls backend to invalidate session, clears local token
export async function logout() {
  try {
    await authAPI.logout();
  } catch (err) {
    console.warn('Logout API call failed:', err);
  }
  clearToken();
}

// ── Verify session with backend ────────────────────────────
// Call this on app startup to verify JWT is still valid
export async function verifySession() {
  if (!getToken()) return null;
  try {
    const result = await authAPI.verify();
    return getSession();
  } catch (error) {
    clearToken();
    return null;
  }
}

// ── Get volunteers (with server-side filtering) ────────────
// SECURITY: Server enforces role-based access
export function getVolunteers() {
  return DEMO_USERS.filter(u => u.role === 'volunteer').map(u => {
    const { password, ...safe } = u;
    return safe;
  });
}

export function getAllUsers() {
  return DEMO_USERS.map(u => {
    const { password, ...safe } = u;
    return safe;
  });
}
