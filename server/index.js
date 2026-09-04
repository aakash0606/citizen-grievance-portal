require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
});
const upload = multer({ storage });

// ---- Email transporter (Gmail) ----
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ---- In-memory OTP tracking (fine for a learning project; a real production app would use Redis/DB) ----
const otpStore = new Map();       // email -> { code, expiresAt }
const verifiedEmails = new Map(); // email -> expiresAt (window to complete registration)

app.get('/', (req, res) => res.send('Grievance Portal API is running'));
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/departments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    res.json({ success: true, departments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- SEND OTP ----
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ success: false, error: 'Email already registered' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Grievance Portal Verification Code',
      html: `<p>Your verification code is <b>${otp}</b>. It expires in 5 minutes.</p>`,
    });

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- VERIFY OTP ----
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ success: false, error: 'No OTP requested for this email' });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, error: 'OTP expired, please request a new one' });
  }
  if (record.code !== otp) return res.status(400).json({ success: false, error: 'Incorrect OTP' });

  otpStore.delete(email);
  verifiedEmails.set(email, Date.now() + 30 * 60 * 1000); // 30 min window to finish registering
  res.json({ success: true, message: 'Email verified' });
});

// ---- REGISTER (now requires verified email) ----
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, department_id, district, ward_locality } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    if (role === 'officer' && !department_id) {
      return res.status(400).json({ success: false, error: 'Officers must select a department' });
    }

    const verifiedUntil = verifiedEmails.get(email);
    if (!verifiedUntil || Date.now() > verifiedUntil) {
      return res.status(400).json({ success: false, error: 'Please verify your email with OTP before registering' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department_id, district, ward_locality, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id, name, email, role, department_id`,
      [name, email, password_hash, role, role === 'officer' ? department_id : null, district || null, ward_locality || null]
    );

    verifiedEmails.delete(email);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, error: 'Email already registered' });
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ success: false, error: 'Invalid email or password' });
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ success: false, error: 'Invalid email or password' });
    const token = jwt.sign(
      { id: user.id, role: user.role, department_id: user.department_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true, token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department_id: user.department_id },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
}

function categorize(description) {
  const text = description.toLowerCase();
  if (text.includes('water') || text.includes('pipe') || text.includes('leak')) return 'Water';
  if (text.includes('road') || text.includes('pothole')) return 'Roads';
  if (text.includes('electricity') || text.includes('power')) return 'Electricity';
  if (text.includes('garbage') || text.includes('waste')) return 'Sanitation';
  return 'General';
}

function detectPriority(description) {
  const text = description.toLowerCase();
  const urgentWords = ['urgent', 'emergency', 'danger', 'accident', 'fire', 'injury', 'death', 'critical', 'life threatening'];
  return urgentWords.some((w) => text.includes(w)) ? 'High' : 'Normal';
}

async function autoEscalate() {
  const thresholdDays = 3;
  const result = await pool.query(
    `UPDATE grievances SET status = 'Escalated', updated_at = NOW()
     WHERE status IN ('Pending', 'In Progress')
     AND created_at < NOW() - INTERVAL '${thresholdDays} days'
     RETURNING id`
  );
  for (const row of result.rows) {
    await pool.query(
      `INSERT INTO status_history (grievance_id, status, changed_by, remark) VALUES ($1, 'Escalated', NULL, 'Auto-escalated: exceeded response time threshold')`,
      [row.id]
    );
  }
}

app.post('/api/grievances', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, department_id } = req.body;
    const citizen_id = req.user.id;
    if (!title || !description || !department_id) {
      return res.status(400).json({ success: false, error: 'Title, description and department are required' });
    }
    const category = categorize(description);
    const priority = detectPriority(description);
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO grievances (citizen_id, department_id, title, description, category, status, image_url, priority)
       VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7) RETURNING *`,
      [citizen_id, department_id, title, description, category, image_url, priority]
    );
    const grievance = result.rows[0];
    await pool.query(
      `INSERT INTO status_history (grievance_id, status, changed_by, remark) VALUES ($1, 'Pending', $2, 'Grievance filed by citizen')`,
      [grievance.id, citizen_id]
    );
    res.json({ success: true, grievance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/grievances/mine', verifyToken, async (req, res) => {
  try {
    await autoEscalate();
    const result = await pool.query(
      `SELECT g.*, d.name AS department_name FROM grievances g
       JOIN departments d ON g.department_id = d.id
       WHERE citizen_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, grievances: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/grievances/department', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'officer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only officers can view this' });
    }
    if (!req.user.department_id) return res.json({ success: true, grievances: [] });
    await autoEscalate();
    const result = await pool.query(
      `SELECT * FROM grievances WHERE department_id = $1 ORDER BY priority DESC, created_at DESC`,
      [req.user.department_id]
    );
    res.json({ success: true, grievances: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/grievances/:id/status', verifyToken, upload.single('resolutionImage'), async (req, res) => {
  try {
    if (req.user.role !== 'officer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only officers can update status' });
    }
    const { id } = req.params;
    const { status, remark } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Resolved - Pending Confirmation', 'Escalated'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status value' });
    if (!remark || remark.trim() === '') return res.status(400).json({ success: false, error: 'A remark is required for every status change' });

    const existing = await pool.query('SELECT * FROM grievances WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Grievance not found' });
    const grievance = existing.rows[0];
    if (grievance.department_id !== req.user.department_id) {
      return res.status(403).json({ success: false, error: 'This grievance does not belong to your department' });
    }

    let resolution_image_url = grievance.resolution_image_url;
    if (status === 'Resolved - Pending Confirmation') {
      if (!req.file) return res.status(400).json({ success: false, error: 'A photo of the resolved issue is required' });
      resolution_image_url = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE grievances SET status = $1, resolution_image_url = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, resolution_image_url, id]
    );
    await pool.query(
      `INSERT INTO status_history (grievance_id, status, changed_by, remark, image_url) VALUES ($1, $2, $3, $4, $5)`,
      [id, status, req.user.id, remark, status === 'Resolved - Pending Confirmation' ? resolution_image_url : null]
    );
    res.json({ success: true, grievance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/grievances/:id/confirm', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM grievances WHERE id = $1 AND citizen_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Grievance not found or not yours' });
    if (existing.rows[0].status !== 'Resolved - Pending Confirmation') {
      return res.status(400).json({ success: false, error: 'This grievance is not awaiting confirmation' });
    }
    const result = await pool.query(`UPDATE grievances SET status = 'Closed', updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
    await pool.query(
      `INSERT INTO status_history (grievance_id, status, changed_by, remark) VALUES ($1, 'Closed', $2, 'Citizen confirmed the issue was resolved')`,
      [id, req.user.id]
    );
    res.json({ success: true, grievance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/grievances/:id/reopen', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    const existing = await pool.query('SELECT * FROM grievances WHERE id = $1 AND citizen_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Grievance not found or not yours' });
    if (existing.rows[0].status !== 'Resolved - Pending Confirmation') {
      return res.status(400).json({ success: false, error: 'This grievance is not awaiting confirmation' });
    }
    const result = await pool.query(`UPDATE grievances SET status = 'Reopened', updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
    await pool.query(
      `INSERT INTO status_history (grievance_id, status, changed_by, remark) VALUES ($1, 'Reopened', $2, $3)`,
      [id, req.user.id, remark || 'Citizen reported the issue is not actually resolved']
    );
    res.json({ success: true, grievance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/grievances/:id/rate', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    const existing = await pool.query('SELECT * FROM grievances WHERE id = $1 AND citizen_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Grievance not found or not yours' });
    if (existing.rows[0].status !== 'Closed') return res.status(400).json({ success: false, error: 'Can only rate closed grievances' });
    const result = await pool.query('UPDATE grievances SET rating = $1, feedback = $2 WHERE id = $3 RETURNING *', [rating, feedback || null, id]);
    res.json({ success: true, grievance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/grievances/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const grievanceResult = await pool.query('SELECT * FROM grievances WHERE id = $1', [id]);
    if (grievanceResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Grievance not found' });
    const g = grievanceResult.rows[0];
    const isOwner = req.user.role === 'citizen' && g.citizen_id === req.user.id;
    const isOfficerOfDept = (req.user.role === 'officer' || req.user.role === 'admin') && g.department_id === req.user.department_id;
    if (!isOwner && !isOfficerOfDept) return res.status(403).json({ success: false, error: 'Not authorized to view this' });
    const historyResult = await pool.query('SELECT * FROM status_history WHERE grievance_id = $1 ORDER BY changed_at ASC', [id]);
    res.json({ success: true, grievance: g, timeline: historyResult.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT g.id, g.title, g.category, g.status, g.priority, g.created_at, g.updated_at, d.name AS department_name
       FROM grievances g JOIN departments d ON g.department_id = d.id WHERE g.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'No grievance found with that ID' });
    const historyResult = await pool.query('SELECT status, remark, changed_at FROM status_history WHERE grievance_id = $1 ORDER BY changed_at ASC', [id]);
    res.json({ success: true, grievance: result.rows[0], timeline: historyResult.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));