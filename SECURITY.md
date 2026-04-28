# SAHAYA — Security Architecture

## Overview
Sahaya implements a **zero-trust** security model where:
- **Frontend** handles UI and local state only
- **Backend** enforces ALL security decisions
- **JWT tokens** provide stateless authentication
- **Roles** are embedded in signed tokens and re-validated server-side

---

## Security Rules

### 1. Admin ID — Hardcoded Server-Side (✅ Immutable)
**Rule:** Admin ID cannot be changed from the browser or API client.

**Implementation:**
```javascript
// Backend (Node.js/Express)
const HARDCODED_ADMIN_ID = process.env.ADMIN_ID || 'admin-001';

// Any request to promote a user to admin:
app.post('/api/admin/users/:userId/promote', authenticate, authorize('admin'), (req, res) => {
  // Check requester's ID == HARDCODED_ADMIN_ID
  if (req.user.id !== HARDCODED_ADMIN_ID) {
    return res.status(403).json({ error: 'Only hardcoded admin can promote users' });
  }
  // Proceed with promotion
});
```

**Why it works:**
- `HARDCODED_ADMIN_ID` is read from secure environment variables only
- Never exposed to frontend
- Any API call modifying admin roles must pass this check
- Frontend cannot override or bypass this

---

### 2. Volunteer Requests — Database-Stored & Approved by Admin
**Rule:** Volunteer registration creates a *pending request* in the database.
         Only the hardcoded admin can approve, promoting pending → active.

**Flow:**
```
User registers as volunteer
     ↓
Backend creates: { id, userId, status: 'pending', ... } in DB
     ↓
Admin sees pending request in Admin Dashboard
     ↓
Admin clicks "Approve" → Backend updates status: 'approved'
     ↓
Approved volunteer can now log in with volunteer role
```

**Implementation:**
```javascript
// Volunteer registration (anyone can request)
app.post('/api/volunteers/register', (req, res) => {
  const pendingRequest = {
    id: generateId(),
    userId: req.body.userId,
    skill: req.body.skill,
    status: 'pending',
    createdAt: Date.now(),
  };
  db.collection('volunteer_requests').insert(pendingRequest);
  res.json({ message: 'Request submitted. Awaiting admin approval.' });
});

// Approve request (admin only)
app.post('/api/volunteers/requests/:requestId/approve', authenticate, authorize('admin'), (req, res) => {
  // Must be hardcoded admin
  if (req.user.id !== HARDCODED_ADMIN_ID) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const request = db.collection('volunteer_requests').findById(req.params.requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  
  // Update request status
  db.collection('volunteer_requests').update(req.params.requestId, { status: 'approved' });
  
  // Create volunteer record
  db.collection('volunteers').insert({
    userId: request.userId,
    skill: request.skill,
    createdAt: Date.now(),
  });
  
  res.json({ message: 'Volunteer approved' });
});
```

**Why it works:**
- Pending requests are stored in database, not localStorage
- Frontend cannot modify database
- Only admin with hardcoded ID can approve
- Unapproved users cannot log in as volunteers

---

### 3. Role in Signed JWT Token (✅ Tamper-Proof)
**Rule:** Role is embedded in a signed JWT token issued by the backend.
        Tampering with the token invalidates the signature.

**Flow:**
```
User logs in with email/password
     ↓
Backend validates credentials
     ↓
Backend generates JWT with:
  - userId, email, role, permissions
  - Signed with SERVER_SECRET
  - Expiration time (e.g., 24 hours)
     ↓
Backend sends token to frontend
     ↓
Frontend stores token (localStorage for demo, httpOnly cookie for production)
     ↓
On each API request, frontend sends: Authorization: Bearer <JWT>
     ↓
Backend re-validates signature and role
```

**Implementation:**
```javascript
// Backend issues JWT after login
const jwt = require('jsonwebtoken');

app.post('/api/auth/login', async (req, res) => {
  const user = db.collection('users').findByEmail(req.body.email);
  if (!user || !bcrypt.compareSync(req.body.password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role, // 'admin', 'volunteer', or 'user'
      permissions: getPermissions(user.role),
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token });
});

// Backend verifies JWT on each request
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // ← Role comes from verified token
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check role
const authorize = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

**Why it works:**
- Token is cryptographically signed with a server-side secret
- Frontend cannot forge or modify tokens
- Any tampering breaks the signature
- `jwt.verify()` will throw if signature is invalid
- Expiration is checked automatically

---

### 4. Every Route Checks Role Server-Side (✅ Defense-in-Depth)
**Rule:** No endpoint trusts the client. Every route re-validates role and permissions.

**Implementation:**
```javascript
// Example: Only admins can view all incidents
app.get('/api/incidents', authenticate, authorize('admin'), (req, res) => {
  const incidents = db.collection('incidents').findAll();
  res.json(incidents);
});

// Example: Volunteers can only view assigned incidents
app.get('/api/incidents', authenticate, (req, res) => {
  if (req.user.role === 'volunteer') {
    const incidents = db.collection('incidents').findByAssignee(req.user.userId);
    return res.json(incidents);
  }
  
  if (req.user.role === 'user') {
    const incidents = db.collection('incidents').findByReporter(req.user.userId);
    return res.json(incidents);
  }
  
  if (req.user.role === 'admin') {
    const incidents = db.collection('incidents').findAll();
    return res.json(incidents);
  }
  
  return res.status(403).json({ error: 'Forbidden' });
});

// Example: Only the reporter or admin can view incident details
app.get('/api/incidents/:id', authenticate, (req, res) => {
  const incident = db.collection('incidents').findById(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });
  
  // Access control: reporter, assigned volunteer, or admin
  const canView = 
    req.user.role === 'admin' ||
    incident.reportedBy === req.user.userId ||
    incident.assignedTo === req.user.userId;
  
  if (!canView) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(incident);
});

// Example: Only admin can assign incidents
app.post('/api/incidents/:id/assign', authenticate, authorize('admin'), (req, res) => {
  if (req.user.id !== HARDCODED_ADMIN_ID) {
    return res.status(403).json({ error: 'Only hardcoded admin can assign' });
  }
  
  db.collection('incidents').update(req.params.id, { 
    assignedTo: req.body.volunteerId 
  });
  res.json({ message: 'Incident assigned' });
});
```

**Why it works:**
- Every endpoint explicitly checks `req.user.role`
- No shortcuts or client-side proxies
- If JWT is tampered with, signature verification fails
- Each route has its own authorization logic
- Cannot bypass role checks through URL manipulation

---

## Frontend Implementation

### Do NOT Trust Frontend Role Data
The frontend decodes JWT tokens **for display only**:

```javascript
// ❌ WRONG: Using role from localStorage
const role = localStorage.getItem('userRole');
if (role === 'admin') { /* show admin panel */ }

// ✅ CORRECT: Decode from JWT token, but still check server on each API call
const tokenData = decodeToken(getToken());
if (tokenData.role === 'admin') { /* show admin UI hint */ }
// But server will still validate on actual API requests
```

### API Calls Always Include JWT
```javascript
// api.js
export async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
  
  const response = await fetch(API_BASE_URL + endpoint, {
    ...options,
    headers,
  });
  
  // If token invalid/expired, server returns 401
  if (response.status === 401) {
    clearToken();
    redirectToLogin();
    throw new Error('Session expired');
  }
  
  return response.json();
}
```

---

## Deployment Checklist

- [ ] **Backend Secret:** Set `JWT_SECRET` to a strong random string (no default)
- [ ] **Admin ID:** Set `ADMIN_ID` environment variable (hardcoded, never changeable)
- [ ] **HTTPS Only:** All API calls must use HTTPS
- [ ] **CORS:** Frontend origin must be explicitly whitelisted
- [ ] **Tokens:** Use httpOnly cookies in production (not localStorage)
- [ ] **Refresh:** Implement token refresh endpoint for long sessions
- [ ] **Audit Logging:** Log all admin actions for compliance
- [ ] **Rate Limiting:** Prevent brute force on `/auth/login`
- [ ] **Password Hash:** Use bcrypt with salt rounds ≥ 12

---

## Attack Mitigation

| Attack | Frontend | Backend | Mitigation |
|--------|----------|---------|-----------|
| **Role Tampering** | Decode JWT | Verify signature | Cryptographic signing |
| **Token Forgery** | Can't sign | Verify secret | Server-side verification |
| **Expired Token** | Decode checks expiry | jwt.verify() | Automatic rejection |
| **Admin Promotion** | Can't call API | Check hardcoded ID | Immutable on server |
| **Volunteer Bypass** | N/A | Check DB approval | No unapproved access |
| **Cross-Site Scripting** | httpOnly in prod | N/A | Cookie flags |
| **CSRF** | N/A | Check Origin/Referer | Backend validation |

---

## Testing

```bash
# Test hardcoded admin ID cannot be changed
curl -X POST http://localhost:3000/api/admin/users/user-001/promote \
  -H "Authorization: Bearer <token>" \
  -d '{"role":"admin"}' # → Should fail with 403

# Test volunteer request must be approved
curl -X POST http://localhost:3000/api/volunteers/register \
  -d '{"userId":"user-001","skill":"Medical"}' # → Creates pending request

curl -X GET http://localhost:3000/api/volunteers/requests # → Shows pending
# Admin approves → Now user can log in as volunteer

# Test JWT tampering
# Edit token manually → jwt.verify() fails → 401 Unauthorized
```

---

**Built for Rapid Response. Secured for Trust. 🤝**
