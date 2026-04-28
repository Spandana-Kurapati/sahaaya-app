// src/api.js
// ──────────────────────────────────────────────────────────
// Sahaya — Backend API client with JWT auth
// Handles authentication, token refresh, and error handling
// ──────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Token management ───────────────────────────────────────
export function getToken() {
  return localStorage.getItem('sahaya_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('sahaya_token', token);
  } else {
    localStorage.removeItem('sahaya_token');
  }
}

export function clearToken() {
  localStorage.removeItem('sahaya_token');
}

// ── Decode JWT (client-side for display only, don't trust) ─
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch {
    return null;
  }
}

export function getTokenData() {
  const token = getToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded || decoded.exp * 1000 < Date.now()) {
    clearToken();
    return null;
  }
  return decoded;
}

// ── API Request helper ─────────────────────────────────────
export async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle token expiration
  if (response.status === 401) {
    clearToken();
    window.location.href = '/'; // Redirect to login
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ── Auth API ───────────────────────────────────────────────
export const authAPI = {
  // Login with email/password, returns JWT token
  login: async (email, password) => {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Verify session (checks JWT validity on backend)
  verify: async () => {
    return apiCall('/auth/verify', { method: 'POST' });
  },

  // Refresh token
  refreshToken: async () => {
    const data = await apiCall('/auth/refresh', { method: 'POST' });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Logout (clears server session if needed)
  logout: async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout API call failed:', err);
    }
    clearToken();
  },
};

// ── Incident API ───────────────────────────────────────────
export const incidentAPI = {
  // Get all incidents (server enforces role-based filtering)
  getAll: async () => {
    return apiCall('/incidents');
  },

  // Get incident by ID
  getById: async (id) => {
    return apiCall(`/incidents/${id}`);
  },

  // Create new incident
  create: async (incident) => {
    return apiCall('/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  },

  // Update incident (server checks authorization)
  update: async (id, updates) => {
    return apiCall(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Assign incident to volunteer (admin only, server-side check)
  assign: async (incidentId, volunteerId) => {
    return apiCall(`/incidents/${incidentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ volunteerId }),
    });
  },

  // Update status (volunteer or admin only)
  updateStatus: async (id, status) => {
    return apiCall(`/incidents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// ── Volunteer API ──────────────────────────────────────────
export const volunteerAPI = {
  // Get all volunteers (admin only, server enforces)
  getAll: async () => {
    return apiCall('/volunteers');
  },

  // Volunteer self-registration (creates pending request)
  register: async (volunteerData) => {
    return apiCall('/volunteers/register', {
      method: 'POST',
      body: JSON.stringify(volunteerData),
    });
  },

  // Get pending volunteer requests (admin only)
  getPendingRequests: async () => {
    return apiCall('/volunteers/requests');
  },

  // Approve volunteer request (admin only, hardcoded on server)
  approveRequest: async (requestId) => {
    return apiCall(`/volunteers/requests/${requestId}/approve`, {
      method: 'POST',
    });
  },

  // Reject volunteer request (admin only)
  rejectRequest: async (requestId) => {
    return apiCall(`/volunteers/requests/${requestId}/reject`, {
      method: 'POST',
    });
  },

  // Get volunteer profile
  getProfile: async (volunteerId) => {
    return apiCall(`/volunteers/${volunteerId}`);
  },

  // Update volunteer profile
  updateProfile: async (volunteerId, updates) => {
    return apiCall(`/volunteers/${volunteerId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ── User API ───────────────────────────────────────────────
export const userAPI = {
  // Get current user profile
  getProfile: async () => {
    return apiCall('/users/profile');
  },

  // Update user profile
  updateProfile: async (updates) => {
    return apiCall('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Get user's incidents
  getMyIncidents: async () => {
    return apiCall('/users/incidents');
  },
};

// ── Admin API ──────────────────────────────────────────────
export const adminAPI = {
  // Get dashboard stats (admin only, server-side check)
  getStats: async () => {
    return apiCall('/admin/stats');
  },

  // Get all users (admin only)
  getUsers: async () => {
    return apiCall('/admin/users');
  },

  // Promote user to admin (hardcoded admin ID on server)
  promoteToAdmin: async (userId) => {
    return apiCall(`/admin/users/${userId}/promote`, {
      method: 'POST',
    });
  },

  // Get system logs (admin only)
  getLogs: async () => {
    return apiCall('/admin/logs');
  },
};
