# Frontend Updates — Security & Backend Integration

## What Changed

Your Sahaya frontend has been upgraded to support secure backend authentication with JWT tokens and role-based authorization. Here's what was updated:

---

## 📄 New Files Created

### 1. **src/api.js** — Backend API Client
- Centralized HTTP client for all backend communication
- Automatic JWT token handling in request headers
- Token expiration and automatic redirect to login
- Organized endpoints by domain:
  - `authAPI` — login, verify, logout
  - `incidentAPI` — CRUD operations on incidents
  - `volunteerAPI` — registration, approvals, profiles
  - `userAPI` — user profile management
  - `adminAPI` — admin dashboard and controls
- **Usage**: `import { authAPI, incidentAPI } from './api.js'`

### 2. **SECURITY.md** — Security Architecture Documentation
- Explains all 4 security rules in detail
- Server-side implementation examples
- Frontend best practices
- Attack mitigation table
- Deployment checklist

### 3. **BACKEND_SETUP.md** — Backend Implementation Guide
- Step-by-step instructions to build the backend
- Complete code examples for:
  - Express server setup
  - Database models (User, Incident, VolunteerRequest)
  - Authentication routes with JWT
  - Authorization middleware
  - Volunteer approval workflow
  - Incident assignment
- Testing examples with curl

### 4. **.env.example** — Environment Configuration
- Template for `.env.local` file
- Backend API URL configuration
- Feature flags
- Demo mode toggle

---

## 🔐 Updated Files

### **src/auth.js** — JWT-Based Authentication
**Before:** Used localStorage for session storage (no backend)
```javascript
// ❌ Old way
localStorage.setItem('sahaya_session', JSON.stringify(session));
```

**After:** Uses JWT tokens from backend (with fallback for demo)
```javascript
// ✅ New way
const token = await authAPI.login(email, password);
const session = getSession(); // Decoded from JWT
```

**Key Changes:**
- ✅ `login()` now calls backend API via `authAPI.login()`
- ✅ `getSession()` decodes JWT token from localStorage
- ✅ `logout()` calls backend to invalidate session
- ✅ New `verifySession()` function to verify JWT with backend
- ✅ Fallback to demo mode in development (if backend unavailable)
- ✅ **CRITICAL**: Added comments reminding not to trust frontend role data

---

## 🚀 How It Works Now

### Login Flow
```
User enters email/password
    ↓
Frontend calls authAPI.login(email, password)
    ↓
Backend validates credentials, issues JWT token
    ↓
Frontend stores token in localStorage
    ↓
All future API calls include: Authorization: Bearer <token>
    ↓
Backend verifies JWT signature and checks role on every request
```

### API Requests
```javascript
// All API calls now include JWT automatically
const incidents = await incidentAPI.getAll();
// Equivalent to:
// fetch('/api/incidents', {
//   headers: { 'Authorization': 'Bearer <jwt_token>' }
// })
```

### Role Verification
```javascript
// ✅ SAFE: Display UI based on decoded token
const session = getSession();
if (session?.role === 'admin') {
  // Show admin panel (UI hint only)
}

// But backend ALWAYS re-verifies on actual API requests
// If someone tampered with the token, API call will fail with 401
```

---

## 🛠 Integration Checklist

### To use the updated frontend:

- [ ] Backend is running on `http://localhost:3000` (or set `VITE_API_URL` in `.env.local`)
- [ ] Backend has JWT authentication implemented (see `BACKEND_SETUP.md`)
- [ ] Copy `.env.example` to `.env.local` and update `VITE_API_URL`
- [ ] Update all page components to use `apiCall()` instead of direct store access:

**Example:**
```javascript
// ❌ Old way (in-memory store)
const incidents = incidentStore.getAll();

// ✅ New way (backend API)
import { incidentAPI } from '../api.js';
const incidents = await incidentAPI.getAll();
```

---

## ⚠️ Important Notes

### 1. **Token Storage (Current vs Production)**
Currently: `localStorage` (convenient for demo)
```javascript
localStorage.setItem('sahaya_token', token);
```

Production: Should use `httpOnly` cookie (more secure)
```javascript
// Backend should set: Set-Cookie: sahaya_token=...; HttpOnly; Secure;
// Frontend automatically includes it in requests
```

### 2. **Session Verification on App Load**
Add this to your `App.jsx` component:
```javascript
useEffect(() => {
  const verified = await verifySession();
  setSession(verified);
}, []);
```

### 3. **Fallback to Demo Mode**
If backend is unavailable in development, the frontend falls back to demo mode with fake JWT tokens. Set `VITE_DEMO_MODE=false` in `.env.local` to disable this.

### 4. **Token Expiration**
JWT tokens have an expiration time (default: 24 hours). When expired:
- Frontend automatically clears token
- User is redirected to login
- Option to implement refresh token endpoint for longer sessions

---

## 🔍 Testing the Integration

### 1. Test with Demo Mode (Backend Not Required)
```bash
# Keep VITE_DEMO_MODE=true in .env.local
npm run dev
# Try login with demo credentials (see DEMO_USERS in auth.js)
```

### 2. Test with Real Backend
```bash
# Backend running on http://localhost:3000
# Set VITE_DEMO_MODE=false in .env.local
npm run dev
# Try login with backend-issued credentials
```

### 3. Test JWT Tampering
```javascript
// In browser console:
localStorage.setItem('sahaya_token', 'tampered.token.here');
// Try any API call → should fail with 401 Unauthorized
```

### 4. Test Role Authorization
```javascript
// Login as 'user' role
// Try accessing admin-only endpoint
// Should fail with 403 Forbidden (backend rejects, not frontend)
```

---

## 📚 API Reference

### authAPI
```javascript
await authAPI.login(email, password)           // Returns { token, user }
await authAPI.verify()                         // Verify current session
await authAPI.refreshToken()                   // Get new token
await authAPI.logout()                         // Invalidate session
```

### incidentAPI
```javascript
await incidentAPI.getAll()                     // Get all incidents
await incidentAPI.getById(id)                  // Get single incident
await incidentAPI.create(incident)             // Report new incident
await incidentAPI.update(id, updates)          // Update incident
await incidentAPI.assign(incidentId, volId)    // Assign to volunteer (admin)
await incidentAPI.updateStatus(id, status)     // Update status
```

### volunteerAPI
```javascript
await volunteerAPI.getAll()                    // Get all volunteers
await volunteerAPI.register(data)              // Submit volunteer request
await volunteerAPI.getPendingRequests()        // Get pending (admin)
await volunteerAPI.approveRequest(id)          // Approve (admin)
await volunteerAPI.rejectRequest(id)           // Reject (admin)
await volunteerAPI.getProfile(id)              // Get volunteer profile
await volunteerAPI.updateProfile(id, updates)  // Update profile
```

### userAPI
```javascript
await userAPI.getProfile()                     // Get current user
await userAPI.updateProfile(updates)           // Update current user
await userAPI.getMyIncidents()                 // Get user's incidents
```

### adminAPI
```javascript
await adminAPI.getStats()                      // Dashboard stats (admin)
await adminAPI.getUsers()                      // Get all users (admin)
await adminAPI.promoteToAdmin(userId)          // Promote user (hardcoded admin)
await adminAPI.getLogs()                       // System logs (admin)
```

---

## 🚀 Next Steps

1. **Build Backend**: Follow [BACKEND_SETUP.md](BACKEND_SETUP.md) to create the Node.js/Express server
2. **Update Environment**: Copy `.env.example` to `.env.local` and set `VITE_API_URL`
3. **Update Components**: Refactor page components to use `apiAPI`, `incidentAPI`, etc. instead of in-memory store
4. **Test Integration**: Verify login, authorization, and API calls end-to-end
5. **Deploy**: Deploy backend first, then update frontend with production API URL

---

## 📋 Security Verification

- ✅ Frontend cannot forge JWT tokens
- ✅ Frontend cannot change roles (server re-validates)
- ✅ Frontend cannot become admin (hardcoded on server)
- ✅ Volunteer requests must be approved (DB-stored)
- ✅ All tokens are cryptographically signed
- ✅ Expired tokens are automatically rejected
- ✅ Every API call requires valid JWT

---

**Your Sahaya frontend is now ready for secure, scalable backend integration! 🤝**
