# SAHAYA — Backend Setup Guide

## Overview
This is a guide to set up the Node.js/Express backend that works with the secure frontend.

## Quick Start

### 1. Create Backend Project
```bash
mkdir sahaya-backend
cd sahaya-backend
npm init -y
npm install express cors dotenv jsonwebtoken bcryptjs mongoose
npm install --save-dev nodemon
```

### 2. Environment Variables (.env)
```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=24h

# Database
MONGODB_URI=mongodb://localhost:27017/sahaya
# OR use MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/sahaya

# Hardcoded Admin
ADMIN_ID=admin-001
ADMIN_EMAIL=admin@sahaya.org

# Frontend CORS
CORS_ORIGIN=http://localhost:5173
```

### 3. Database Models

#### User Model
```javascript
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'volunteer', 'user'], default: 'user' },
  avatar: String,
  color: String,
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

module.exports = mongoose.model('User', userSchema);
```

#### Incident Model
```javascript
// models/Incident.js
const incidentSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  category: String,
  description: String,
  autoSummary: String,
  priority: { type: Number, default: 5 },
  status: { type: String, enum: ['Reported', 'Assigned', 'In Progress', 'Resolved'], default: 'Reported' },
  reportedBy: String,
  reporterName: String,
  assignedTo: String,
  assignedName: String,
  lat: Number,
  lng: Number,
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  timeline: [{ status: String, ts: Date }],
});

module.exports = mongoose.model('Incident', incidentSchema);
```

#### Volunteer Request Model
```javascript
// models/VolunteerRequest.js
const volunteerRequestSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  name: String,
  email: String,
  skill: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  approvedBy: String, // Admin ID who approved
  approvedAt: Date,
});

module.exports = mongoose.model('VolunteerRequest', volunteerRequestSchema);
```

### 4. Authentication Routes

```javascript
// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        color: user.color,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );
    
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token
router.post('/verify', authenticate, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Logout (optional - can be stateless)
router.post('/logout', authenticate, (req, res) => {
  // In stateless JWT, logout is handled by frontend (clearing token)
  // Optionally: blacklist token in Redis/cache
  res.json({ message: 'Logged out' });
});

module.exports = router;
```

### 5. Authorization Middleware

```javascript
// middleware/authenticate.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticate;

// middleware/authorize.js
const authorize = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = authorize;

// middleware/adminOnly.js
const HARDCODED_ADMIN_ID = process.env.ADMIN_ID;

const adminOnly = (req, res, next) => {
  if (req.user.id !== HARDCODED_ADMIN_ID) {
    return res.status(403).json({ error: 'Only hardcoded admin can perform this action' });
  }
  next();
};

module.exports = adminOnly;
```

### 6. Volunteer Routes

```javascript
// routes/volunteers.js
const express = require('express');
const VolunteerRequest = require('../models/VolunteerRequest');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

// Register as volunteer (creates pending request)
router.post('/register', async (req, res) => {
  try {
    const { userId, name, email, skill } = req.body;
    
    const request = new VolunteerRequest({
      id: `vol-req-${Date.now()}`,
      userId,
      name,
      email,
      skill,
      status: 'pending',
    });
    
    await request.save();
    res.json({ message: 'Volunteer request submitted. Awaiting admin approval.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending requests (admin only)
router.get('/requests', authenticate, authorize(['admin']), adminOnly, async (req, res) => {
  try {
    const requests = await VolunteerRequest.find({ status: 'pending' });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve volunteer (hardcoded admin only)
router.post('/requests/:requestId/approve', authenticate, authorize(['admin']), adminOnly, async (req, res) => {
  try {
    const request = await VolunteerRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    // Update request status
    request.status = 'approved';
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();
    await request.save();
    
    // Update user role to volunteer
    await User.findByIdAndUpdate(request.userId, { role: 'volunteer' });
    
    res.json({ message: 'Volunteer approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject volunteer request (admin only)
router.post('/requests/:requestId/reject', authenticate, authorize(['admin']), adminOnly, async (req, res) => {
  try {
    const request = await VolunteerRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    request.status = 'rejected';
    await request.save();
    
    res.json({ message: 'Volunteer request rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 7. Incident Routes (with authorization)

```javascript
// routes/incidents.js
const express = require('express');
const Incident = require('../models/Incident');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Get incidents (role-based filtering)
router.get('/', authenticate, async (req, res) => {
  try {
    let incidents;
    
    if (req.user.role === 'admin') {
      // Admin sees all
      incidents = await Incident.find().sort({ createdAt: -1 });
    } else if (req.user.role === 'volunteer') {
      // Volunteer sees assigned incidents
      incidents = await Incident.find({ assignedTo: req.user.userId }).sort({ createdAt: -1 });
    } else {
      // User sees their reported incidents
      incidents = await Incident.find({ reportedBy: req.user.userId }).sort({ createdAt: -1 });
    }
    
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report incident (users)
router.post('/', authenticate, async (req, res) => {
  try {
    const incident = new Incident({
      id: `inc-${Date.now()}`,
      ...req.body,
      reportedBy: req.user.userId,
      reporterName: req.user.name,
      createdAt: new Date(),
      timeline: [{ status: 'Reported', ts: new Date() }],
    });
    
    await incident.save();
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign incident (admin only)
router.post('/:id/assign', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: req.body.volunteerId,
        status: 'Assigned',
        $push: { timeline: { status: 'Assigned', ts: new Date() } }
      },
      { new: true }
    );
    
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 8. Main Server (server.js)

```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/volunteers', require('./routes/volunteers'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

### 9. package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "test": "jest"
  }
}
```

## Running the Backend

```bash
# Install dependencies
npm install

# Set up .env file
cp .env.example .env

# Start development server
npm run dev

# Server runs on http://localhost:3000
```

## Testing API Endpoints

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sahaya.org","password":"admin123"}'

# Get token from response, then use it:
TOKEN=eyJhbGciOiJIUzI1NiIs...

# Get incidents
curl -X GET http://localhost:3000/api/incidents \
  -H "Authorization: Bearer $TOKEN"

# Get pending volunteer requests (admin only)
curl -X GET http://localhost:3000/api/volunteers/requests \
  -H "Authorization: Bearer $TOKEN"
```

## Security Checklist

- [ ] Change `JWT_SECRET` to strong random string
- [ ] Set `ADMIN_ID` in environment variables (hardcoded)
- [ ] Enable HTTPS in production
- [ ] Set `CORS_ORIGIN` to production frontend URL
- [ ] Use MongoDB in production (not local)
- [ ] Enable rate limiting on `/auth/login`
- [ ] Add input validation and sanitization
- [ ] Log all admin actions
- [ ] Enable MongoDB access control
- [ ] Set up automated backups

## Next Steps

1. Set up MongoDB (local or Atlas)
2. Configure `.env` with secure secrets
3. Run `npm run dev` to start backend
4. Update frontend `.env.local` with backend URL
5. Test login flow end-to-end
6. Deploy backend (Heroku, DigitalOcean, AWS, etc.)

---

**Ready to launch Sahaya with enterprise-grade security! 🤝**
