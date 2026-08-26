require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to PostgreSQL using the details from your .env file
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test route - just to check the server is alive
app.get('/', (req, res) => {
  res.send('Grievance Portal API is running');
});

// Test route - checks the database connection works
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- REGISTER ROUTE ----
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
      [name, email, password_hash, role]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- LOGIN ROUTE ----
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- MIDDLEWARE: Verify JWT token ----
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = decoded; // { id, role }
    next();
  });
}

// ---- Simple keyword-based auto-categorization ----
function categorizeGrievance(description) {
  const text = description.toLowerCase();

  if (text.includes('water') || text.includes('pipe') || text.includes('leak')) {
    return { category: 'Water', departmentName: 'Water Department' };
  }
  if (text.includes('road') || text.includes('pothole') || text.includes('street')) {
    return { category: 'Roads', departmentName: 'Roads Department' };
  }
  if (text.includes('electricity') || text.includes('power') || text.includes('light')) {
    return { category: 'Electricity', departmentName: 'Electricity Department' };
  }
  if (text.includes('garbage') || text.includes('trash') || text.includes('waste')) {
    return { category: 'Sanitation', departmentName: 'Sanitation Department' };
  }
  return { category: 'General', departmentName: 'General' };
}

// ---- CREATE GRIEVANCE ROUTE ----
app.post('/api/grievances', verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    const citizen_id = req.user.id;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }

    // Auto-categorize based on keywords
    const { category, departmentName } = categorizeGrievance(description);

    // Find the department_id matching that department name
    const deptResult = await pool.query('SELECT id FROM departments WHERE name = $1', [departmentName]);
    const department_id = deptResult.rows[0]?.id || null;

    const result = await pool.query(
      `INSERT INTO grievances (citizen_id, department_id, title, description, category, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING *`,
      [citizen_id, department_id, title, description, category]
    );

    const grievance = result.rows[0];

    // Log this creation into status_history too
    await pool.query(
      `INSERT INTO status_history (grievance_id, status, changed_by) VALUES ($1, $2, $3)`,
      [grievance.id, 'Pending', citizen_id]
    );

    res.json({ success: true, grievance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- GET MY GRIEVANCES (for logged-in citizen) ----
app.get('/api/grievances/mine', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM grievances WHERE citizen_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, grievances: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- GET GRIEVANCES FOR OFFICER'S DEPARTMENT ----
app.get('/api/grievances/department', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'officer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only officers can view this' });
    }

    // For simplicity, officer sees all grievances (you can filter by their department later)
    const result = await pool.query(
      'SELECT * FROM grievances ORDER BY created_at DESC'
    );
    res.json({ success: true, grievances: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- UPDATE GRIEVANCE STATUS (Officer only) ----
app.patch('/api/grievances/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'officer' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only officers can update status' });
    }

    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Escalated'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const result = await pool.query(
      `UPDATE grievances SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }

    // Log this status change into status_history
    await pool.query(
      `INSERT INTO status_history (grievance_id, status, changed_by) VALUES ($1, $2, $3)`,
      [id, status, req.user.id]
    );

    res.json({ success: true, grievance: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---- GET SINGLE GRIEVANCE + FULL STATUS TIMELINE (for tracking) ----
app.get('/api/grievances/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const grievanceResult = await pool.query('SELECT * FROM grievances WHERE id = $1', [id]);
    if (grievanceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }

    const historyResult = await pool.query(
      'SELECT * FROM status_history WHERE grievance_id = $1 ORDER BY changed_at ASC',
      [id]
    );

    res.json({
      success: true,
      grievance: grievanceResult.rows[0],
      timeline: historyResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});