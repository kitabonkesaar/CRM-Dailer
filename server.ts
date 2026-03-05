import express from 'express';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Database setup
const db = new Database('salesdial.db');
db.pragma('journal_mode = WAL');

// Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'New',
    temperature TEXT DEFAULT 'Cold',
    ai_score INTEGER DEFAULT 0,
    last_contacted DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    agent_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    duration INTEGER,
    outcome TEXT,
    recording_url TEXT,
    transcription TEXT,
    sentiment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags TEXT,
    agent_id INTEGER,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    scheduled_at DATETIME,
    notes TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    agent_id INTEGER,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'Agent',
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add columns if they don't exist (Migration helper)
try {
  db.exec("ALTER TABLE calls ADD COLUMN tags TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE leads ADD COLUMN agent_id INTEGER");
} catch (e) {}
try {
  db.exec("ALTER TABLE calls ADD COLUMN agent_id INTEGER");
} catch (e) {}
try {
  db.exec("ALTER TABLE followups ADD COLUMN agent_id INTEGER");
} catch (e) {}

// Seed Data
const seedData = () => {
  const agentCount = db.prepare('SELECT count(*) as count FROM agents').get() as { count: number };
  if (agentCount.count === 0) {
    console.log('Seeding agents...');
    const insertAgent = db.prepare('INSERT INTO agents (name, email, role) VALUES (?, ?, ?)');
    insertAgent.run('John Doe', 'john@example.com', 'Agent');
    insertAgent.run('Jane Smith', 'jane@example.com', 'Manager');
    insertAgent.run('Admin User', 'admin@example.com', 'Admin');
  }

  const leadCount = db.prepare('SELECT count(*) as count FROM leads').get() as { count: number };
  if (leadCount.count === 0) {
    console.log('Seeding leads...');
    const insertLead = db.prepare('INSERT INTO leads (name, phone, status, temperature, ai_score, notes) VALUES (?, ?, ?, ?, ?, ?)');
    insertLead.run('Alice Johnson', '+15550101', 'New', 'Warm', 75, 'Interested in summer trip');
    insertLead.run('Bob Williams', '+15550102', 'New', 'Cold', 20, 'Just browsing');
    insertLead.run('Charlie Brown', '+15550103', 'Follow-up Required', 'Hot', 90, 'Ready to book, needs date confirmation');
  }
};
seedData();

// Helper for Audit Logging
const logAudit = (action: string, entityType: string, entityId: number | null, details: string) => {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (action, entity_type, entity_id, details) VALUES (?, ?, ?, ?)');
    stmt.run(action, entityType, entityId, details);
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
};

// Zod Schemas
const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(5, "Phone number is too short"),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  agent_id: z.number().optional().nullable(),
  status: z.string().optional(),
  temperature: z.string().optional(),
  ai_score: z.number().optional()
});

const agentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['Agent', 'Admin', 'Manager']).default('Agent'),
  status: z.enum(['Active', 'Inactive']).default('Active').optional()
});

const callSchema = z.object({
  lead_id: z.number(),
  duration: z.number(),
  outcome: z.string(),
  sentiment: z.string().optional(),
  transcription: z.string().optional(),
  tags: z.string().optional(),
  agent_id: z.number().optional().nullable()
});

const followupSchema = z.object({
  lead_id: z.number(),
  scheduled_at: z.string().datetime(),
  notes: z.string().optional(),
  agent_id: z.number().optional().nullable()
});


// API Routes

// Leads
app.get('/api/leads', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : '%';
    const status = req.query.status || '%';
    const agentId = req.query.agentId;

    let query = `
      SELECT l.*, a.name as agent_name 
      FROM leads l 
      LEFT JOIN agents a ON l.agent_id = a.id
      WHERE (l.name LIKE ? OR l.phone LIKE ?) 
      AND l.status LIKE ?
    `;
    
    const params = [search, search, status];

    if (agentId) {
      query += ` AND l.agent_id = ?`;
      params.push(agentId);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const leads = db.prepare(query).all(...params);
    
    // Get total count for pagination
    let countQuery = `SELECT count(*) as count FROM leads WHERE (name LIKE ? OR phone LIKE ?) AND status LIKE ?`;
    const countParams = [search, search, status];
    if (agentId) {
      countQuery += ` AND agent_id = ?`;
      countParams.push(agentId);
    }
    const total = db.prepare(countQuery).get(...countParams) as { count: number };

    res.json({
      data: leads,
      pagination: {
        page,
        limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.post('/api/leads', (req, res) => {
  try {
    const validated = leadSchema.parse(req.body);
    const { name, phone, notes, agent_id } = validated;
    
    const stmt = db.prepare('INSERT INTO leads (name, phone, notes, agent_id) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, phone, notes, agent_id || null);
    logAudit('CREATE', 'LEAD', result.lastInsertRowid as number, `Created lead: ${name}`);
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

app.post('/api/leads/import', (req, res) => {
  try {
    const leads = req.body; // Expecting array of { name, phone, ... }
    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const insert = db.prepare('INSERT INTO leads (name, phone, email, notes, agent_id) VALUES (?, ?, ?, ?, ?)');
    const insertMany = db.transaction((leads) => {
      for (const lead of leads) {
        insert.run(lead.name, lead.phone, lead.email || null, lead.notes || null, lead.agent_id || null);
      }
    });

    insertMany(leads);
    logAudit('IMPORT', 'LEAD', null, `Imported ${leads.length} leads`);
    res.json({ success: true, count: leads.length });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

app.get('/api/leads/:id/details', (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const calls = db.prepare('SELECT * FROM calls WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);
    const followups = db.prepare('SELECT * FROM followups WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);

    res.json({ lead, calls, followups });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead details' });
  }
});

app.put('/api/leads/:id', (req, res) => {
  try {
    const { status, notes, assigned_agent_id, name, phone } = req.body;
    let query = 'UPDATE leads SET ';
    const params = [];
    const updates = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (notes) { updates.push('notes = ?'); params.push(notes); }
    if (assigned_agent_id !== undefined) { updates.push('agent_id = ?'); params.push(assigned_agent_id); }
    if (name) { updates.push('name = ?'); params.push(name); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }

    if (updates.length === 0) return res.json({ success: true });

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(req.params.id);

    db.prepare(query).run(...params);
    logAudit('UPDATE', 'LEAD', parseInt(req.params.id), `Updated lead fields: ${updates.join(', ')}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

app.delete('/api/leads/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
    logAudit('DELETE', 'LEAD', parseInt(req.params.id), 'Deleted lead');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Calls
app.post('/api/calls', (req, res) => {
  try {
    const validated = callSchema.parse(req.body);
    const { lead_id, duration, outcome, sentiment, transcription, tags, agent_id } = validated;
    
    const stmt = db.prepare(`
      INSERT INTO calls (lead_id, duration, outcome, sentiment, transcription, tags, agent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(lead_id, duration, outcome, sentiment, transcription, tags, agent_id || null);
    
    // Update lead last_contacted
    db.prepare('UPDATE leads SET last_contacted = CURRENT_TIMESTAMP WHERE id = ?').run(lead_id);
    
    logAudit('CREATE', 'CALL', result.lastInsertRowid as number, `Logged call for lead ${lead_id} with outcome ${outcome}`);
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to log call' });
  }
});

app.get('/api/call-logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT c.*, l.name as lead_name, a.name as agent_name
      FROM calls c
      JOIN leads l ON c.lead_id = l.id
      LEFT JOIN agents a ON c.agent_id = a.id
      ORDER BY c.created_at DESC
    `).all();
    
    // Simple CSV export if requested
    if (req.headers.accept === 'text/csv') {
      const header = 'ID,Lead,Agent,Duration,Outcome,Date\n';
      const rows = logs.map((l: any) => 
        `${l.id},"${l.lead_name}","${l.agent_name || 'Unknown'}",${l.duration},"${l.outcome}",${l.created_at}`
      ).join('\n');
      res.header('Content-Type', 'text/csv');
      res.send(header + rows);
      return;
    }

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

// Followups
app.get('/api/followups', (req, res) => {
  try {
    const followups = db.prepare(`
      SELECT f.*, l.name as lead_name, l.phone as lead_phone, l.temperature, l.notes as lead_notes
      FROM followups f
      JOIN leads l ON f.lead_id = l.id
      WHERE f.status = 'Pending'
      ORDER BY f.scheduled_at ASC
    `).all();
    res.json(followups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followups' });
  }
});

app.post('/api/followups', (req, res) => {
  try {
    const validated = followupSchema.parse(req.body);
    const { lead_id, scheduled_at, notes, agent_id } = validated;
    
    const stmt = db.prepare('INSERT INTO followups (lead_id, scheduled_at, notes, agent_id) VALUES (?, ?, ?, ?)');
    const result = stmt.run(lead_id, scheduled_at, notes, agent_id || null);
    logAudit('CREATE', 'FOLLOWUP', result.lastInsertRowid as number, `Scheduled followup for lead ${lead_id}`);
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create followup' });
  }
});

app.post('/api/followups/:id/complete', (req, res) => {
  try {
    db.prepare("UPDATE followups SET status = 'Completed' WHERE id = ?").run(req.params.id);
    logAudit('COMPLETE', 'FOLLOWUP', parseInt(req.params.id), 'Completed followup');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete followup' });
  }
});

app.post('/api/followups/:id/reschedule', (req, res) => {
  try {
    const { scheduled_at } = req.body;
    db.prepare("UPDATE followups SET scheduled_at = ? WHERE id = ?").run(scheduled_at, req.params.id);
    logAudit('RESCHEDULE', 'FOLLOWUP', parseInt(req.params.id), `Rescheduled to ${scheduled_at}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reschedule followup' });
  }
});

// Admin & Stats
app.get('/api/admin/stats', (req, res) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const totalCalls = db.prepare(`SELECT count(*) as count FROM calls ${dateFilter}`).get(...params) as { count: number };
    const totalLeads = db.prepare(`SELECT count(*) as count FROM leads ${dateFilter}`).get(...params) as { count: number };
    const activeAgents = db.prepare("SELECT count(*) as count FROM agents WHERE status = 'Active'").get() as { count: number };
    
    const bookedLeads = db.prepare(`SELECT count(*) as count FROM leads WHERE status = 'Booked' ${startDate && endDate ? 'AND created_at BETWEEN ? AND ?' : ''}`).get(...params) as { count: number };
    const conversionRate = totalLeads.count > 0 ? ((bookedLeads.count / totalLeads.count) * 100).toFixed(1) : 0;

    res.json({
      totalCalls: totalCalls.count,
      totalLeads: totalLeads.count,
      activeAgents: activeAgents.count,
      conversionRate
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/agents', (req, res) => {
  try {
    const agents = db.prepare('SELECT * FROM agents ORDER BY created_at DESC').all();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.post('/api/admin/agents', (req, res) => {
  try {
    const validated = agentSchema.parse(req.body);
    const { name, email, role } = validated;
    
    const stmt = db.prepare('INSERT INTO agents (name, email, role) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, role);
    logAudit('CREATE', 'AGENT', result.lastInsertRowid as number, `Created agent: ${name}`);
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

app.put('/api/admin/agents/:id', (req, res) => {
  try {
    const { name, email, role, status } = req.body;
    const stmt = db.prepare('UPDATE agents SET name = ?, email = ?, role = ?, status = ? WHERE id = ?');
    stmt.run(name, email, role, status, req.params.id);
    logAudit('UPDATE', 'AGENT', parseInt(req.params.id), `Updated agent: ${name}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

app.delete('/api/admin/agents/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    logAudit('DELETE', 'AGENT', parseInt(req.params.id), 'Deleted agent');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

app.get('/api/admin/leaderboard', (req, res) => {
  try {
    const leaderboard = db.prepare(`
      SELECT a.id, a.name, 
        COUNT(c.id) as total_calls, 
        SUM(c.duration) as total_duration,
        (SELECT COUNT(*) FROM leads l WHERE l.agent_id = a.id AND l.status = 'Booked') as conversions
      FROM agents a
      LEFT JOIN calls c ON a.id = c.agent_id
      GROUP BY a.id
      ORDER BY conversions DESC, total_calls DESC
    `).all();
    
    // Handle nulls
    const sanitized = leaderboard.map((l: any) => ({
      ...l,
      total_duration: l.total_duration || 0
    }));
    
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/api/admin/top-agents', (req, res) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND l.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const topAgents = db.prepare(`
      SELECT a.name, COUNT(l.id) as conversions
      FROM agents a
      JOIN leads l ON a.id = l.agent_id
      WHERE l.status = 'Booked' ${dateFilter}
      GROUP BY a.id
      ORDER BY conversions DESC
      LIMIT 5
    `).all(...params);
    res.json(topAgents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top agents' });
  }
});

app.get('/api/admin/calls-over-time', (req, res) => {
  try {
    const calls = db.prepare(`
      SELECT date(created_at) as date, count(*) as count 
      FROM calls 
      GROUP BY date(created_at) 
      ORDER BY date(created_at) DESC 
      LIMIT 30
    `).all();
    res.json(calls.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calls over time' });
  }
});

app.get('/api/admin/audit-logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
