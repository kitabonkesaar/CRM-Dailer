import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("salesdial.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'Agent', -- 'Agent', 'Admin'
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assigned_agent_id INTEGER,
    name TEXT,
    phone TEXT UNIQUE,
    source TEXT,
    trip_interested TEXT,
    status TEXT DEFAULT 'New',
    ai_score INTEGER DEFAULT 0,
    temperature TEXT DEFAULT 'Cold',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_interaction DATETIME,
    FOREIGN KEY(assigned_agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    agent_id INTEGER,
    type TEXT, -- 'incoming', 'outgoing'
    duration INTEGER,
    outcome TEXT,
    notes TEXT,
    tags TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id),
    FOREIGN KEY(agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    assigned_agent_id INTEGER,
    scheduled_at DATETIME,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Completed', 'Missed'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id),
    FOREIGN KEY(assigned_agent_id) REFERENCES agents(id)
  );
`);

// Seed Demo Data
const agentCount = db.prepare("SELECT COUNT(*) as count FROM agents").get().count;
if (agentCount === 0) {
  console.log("Seeding agents...");
  const agents = [
    { name: "Alice Johnson", email: "alice@example.com", role: "Agent" },
    { name: "Bob Smith", email: "bob@example.com", role: "Agent" },
    { name: "Charlie Admin", email: "admin@example.com", role: "Admin" }
  ];
  const insertAgent = db.prepare("INSERT INTO agents (name, email, role) VALUES (?, ?, ?)");
  agents.forEach(a => insertAgent.run(a.name, a.email, a.role));
}

const leadCount = db.prepare("SELECT COUNT(*) as count FROM leads").get().count;
if (leadCount === 0) {
  console.log("Seeding demo data...");
  const demoLeads = [
    { name: "John Doe", phone: "+1234567890", source: "Facebook Ads", trip: "Bali Luxury Package", score: 85, temp: "Hot", status: "Interested" },
    { name: "Sarah Smith", phone: "+1987654321", source: "Google Search", trip: "Europe Explorer", score: 45, temp: "Warm", status: "Follow-up Required" },
    { name: "Mike Johnson", phone: "+1122334455", source: "Referral", trip: "Maldives Honeymoon", score: 15, temp: "Cold", status: "New" },
    { name: "Emily Brown", phone: "+1555666777", source: "Instagram", trip: "Swiss Alps Adventure", score: 92, temp: "Hot", status: "Booked" },
    { name: "David Wilson", phone: "+1444333222", source: "Website", trip: "Dubai City Tour", score: 60, temp: "Warm", status: "Asked Price" },
    { name: "Jessica Lee", phone: "+1777888999", source: "Facebook Ads", trip: "Kedarnath May 8", score: 78, temp: "Hot", status: "Interested" },
    { name: "Robert Chen", phone: "+1333444555", source: "Google Search", trip: "Mahakeswar March 26", score: 30, temp: "Cold", status: "New" },
    { name: "Amanda White", phone: "+1666777888", source: "Instagram", trip: "Bali Luxury Package", score: 55, temp: "Warm", status: "Interested" },
    { name: "Thomas Miller", phone: "+1222333444", source: "Referral", trip: "Europe Explorer", score: 88, temp: "Hot", status: "Follow-up Required" },
    { name: "Sophia Garcia", phone: "+1999000111", source: "Website", trip: "Maldives Honeymoon", score: 10, temp: "Cold", status: "New" }
  ];

  const insertLead = db.prepare("INSERT INTO leads (name, phone, source, trip_interested, ai_score, temperature, status, assigned_agent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const insertCall = db.prepare("INSERT INTO calls (lead_id, agent_id, type, duration, outcome, notes, tags, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const insertFollowup = db.prepare("INSERT INTO followups (lead_id, assigned_agent_id, scheduled_at) VALUES (?, ?, ?)");

  demoLeads.forEach((l, idx) => {
    const agentId = (idx % 2) + 1; // Assign to agent 1 or 2
    const info = insertLead.run(l.name, l.phone, l.source, l.trip, l.score, l.temp, l.status, agentId);
    const leadId = info.lastInsertRowid;

    // Add multiple calls for each lead to populate history
    const now = new Date();

    // Call 1: Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(10 + idx, 30);
    insertCall.run(leadId, agentId, idx % 3 === 0 ? 'incoming' : 'outgoing', 120 + (idx * 10), l.status, `Discussion about ${l.trip}`, 'Demo,Initial', yesterday.toISOString());

    // Call 2: Today (for some)
    if (idx % 2 === 0) {
      const today = new Date(now);
      today.setHours(9 + idx, 15);
      insertCall.run(leadId, agentId, 'outgoing', 45, 'Follow-up', 'Quick check-in', 'Demo,Followup', today.toISOString());
    }

    // Add a follow-up for warm/hot leads
    if (l.temp !== 'Cold' && l.status !== 'Booked') {
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() + (idx % 3));
      scheduled.setHours(11 + (idx % 5), 0);
      insertFollowup.run(leadId, agentId, scheduled.toISOString());
    }
  });
}

// Migration for tags column if it doesn't exist
try {
  db.prepare("ALTER TABLE calls ADD COLUMN tags TEXT").run();
} catch (e) {
  // Column already exists or table doesn't exist yet (handled by CREATE TABLE)
}

// Migration for agent_id columns
try {
  db.prepare("ALTER TABLE leads ADD COLUMN assigned_agent_id INTEGER REFERENCES agents(id)").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE calls ADD COLUMN agent_id INTEGER REFERENCES agents(id)").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE followups ADD COLUMN assigned_agent_id INTEGER REFERENCES agents(id)").run();
} catch (e) {}


const app = express();
app.use(express.json());

// API Routes
app.get("/api/leads", (req, res) => {
  const leads = db.prepare(`
    SELECT l.*, a.name as agent_name,
    (SELECT MIN(scheduled_at) FROM followups f WHERE f.lead_id = l.id AND f.status = 'Pending') as next_followup
    FROM leads l 
    LEFT JOIN agents a ON l.assigned_agent_id = a.id 
    ORDER BY l.ai_score DESC
  `).all();
  res.json(leads);
});

app.post("/api/leads", (req, res) => {
  const { name, phone, source, trip_interested, assigned_agent_id } = req.body;
  try {
    const info = db.prepare("INSERT INTO leads (name, phone, source, trip_interested, assigned_agent_id) VALUES (?, ?, ?, ?, ?)").run(name, phone, source, trip_interested, assigned_agent_id || 1);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: "Lead already exists or invalid data" });
  }
});

app.put("/api/leads/:id", (req, res) => {
  const { name, phone, source, trip_interested, status, assigned_agent_id } = req.body;
  const { id } = req.params;
  
  try {
    db.prepare(`
      UPDATE leads 
      SET name = COALESCE(?, name), 
          phone = COALESCE(?, phone), 
          source = COALESCE(?, source), 
          trip_interested = COALESCE(?, trip_interested), 
          status = COALESCE(?, status),
          assigned_agent_id = COALESCE(?, assigned_agent_id)
      WHERE id = ?
    `).run(name, phone, source, trip_interested, status, assigned_agent_id, id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

app.delete("/api/leads/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
});

app.get("/api/leads/:phone", (req, res) => {
  const lead = db.prepare("SELECT * FROM leads WHERE phone = ?").get(req.params.phone);
  res.json(lead || null);
});

app.post("/api/calls", (req, res) => {
  const { lead_id, phone, type, duration, outcome, notes, tags, followup_date, agent_id } = req.body;

  let targetLeadId = lead_id;

  // If no lead_id, try to find by phone
  if (!targetLeadId && phone) {
    const lead = db.prepare("SELECT id FROM leads WHERE phone = ?").get(phone);
    if (lead) targetLeadId = lead.id;
  }

  // Log the call
  db.prepare("INSERT INTO calls (lead_id, agent_id, type, duration, outcome, notes, tags) VALUES (?, ?, ?, ?, ?, ?, ?)").run(targetLeadId || null, agent_id || 1, type, duration, outcome, notes, tags);

  if (targetLeadId) {
    // Update AI Score (Phase 1: Rule-based)
    let scoreDelta = 0;
    if (outcome === 'Interested') scoreDelta += 20;
    if (duration > 120) scoreDelta += 10; // Long Call (>2 min)
    if (outcome === 'Follow-up' && !followup_date) scoreDelta -= 15; // Follow-up missed (simulated by no date provided when outcome is follow-up)
    if (outcome === 'Not Interested') scoreDelta -= 20;
    if (outcome === 'Not a Lead') scoreDelta = -100; // Reset score for non-leads

    const currentLead = db.prepare("SELECT ai_score FROM leads WHERE id = ?").get(targetLeadId);
    let newScore = Math.min(100, Math.max(0, (currentLead.ai_score || 0) + scoreDelta));

    let temperature = 'Cold';
    if (newScore >= 70) temperature = 'Hot';
    else if (newScore >= 40) temperature = 'Warm';
    
    // Force Cold for 'Not a Lead'
    if (outcome === 'Not a Lead') {
        newScore = 0;
        temperature = 'Cold';
    }

    db.prepare("UPDATE leads SET ai_score = ?, temperature = ?, last_interaction = CURRENT_TIMESTAMP, status = ? WHERE id = ?")
      .run(newScore, temperature, outcome, targetLeadId);

    // Schedule Follow-up if provided
    if (followup_date) {
      db.prepare("INSERT INTO followups (lead_id, assigned_agent_id, scheduled_at) VALUES (?, ?, ?)").run(targetLeadId, agent_id || 1, followup_date);
    }
  }

  res.json({ success: true });
});

app.get("/api/analytics", (req, res) => {
  const totalLeads = db.prepare("SELECT COUNT(*) as count FROM leads").get().count;
  const bookedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'Booked'").get().count;
  const hotLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE temperature = 'Hot'").get().count;
  const pendingFollowups = db.prepare("SELECT COUNT(*) as count FROM followups WHERE status = 'Pending'").get().count;

  const conversionRate = totalLeads > 0 ? (bookedLeads / totalLeads) * 100 : 0;

  res.json({
    totalLeads,
    bookedLeads,
    hotLeads,
    pendingFollowups,
    conversionRate: conversionRate.toFixed(1)
  });
});

app.get("/api/call-logs", (req, res) => {
  const logs = db.prepare(`
    SELECT c.*, l.name as lead_name, l.phone as lead_phone, a.name as agent_name
    FROM calls c 
    LEFT JOIN leads l ON c.lead_id = l.id 
    LEFT JOIN agents a ON c.agent_id = a.id
    ORDER BY c.timestamp DESC 
    LIMIT 100
  `).all();
  res.json(logs);
});

// Admin Endpoints
app.get("/api/admin/agents", (req, res) => {
  const agents = db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all();
  res.json(agents);
});

app.post("/api/admin/agents", (req, res) => {
  const { name, email, role } = req.body;
  try {
    const info = db.prepare("INSERT INTO agents (name, email, role) VALUES (?, ?, ?)").run(name, email, role);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: "Agent already exists" });
  }
});

app.put("/api/admin/agents/:id", (req, res) => {
  const { name, email, role, status } = req.body;
  const { id } = req.params;
  try {
    db.prepare(`
      UPDATE agents 
      SET name = COALESCE(?, name), 
          email = COALESCE(?, email), 
          role = COALESCE(?, role), 
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, email, role, status, id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Update failed" });
  }
});

app.delete("/api/admin/agents/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM agents WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
});

app.get("/api/admin/stats", (req, res) => {
  const totalCalls = db.prepare("SELECT COUNT(*) as count FROM calls").get().count;
  const activeAgents = db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'Active'").get().count;
  const totalLeads = db.prepare("SELECT COUNT(*) as count FROM leads").get().count;
  const bookedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'Booked'").get().count;
  const conversionRate = totalLeads > 0 ? (bookedLeads / totalLeads) * 100 : 0;

  res.json({
    totalCalls,
    activeAgents,
    totalLeads,
    conversionRate: conversionRate.toFixed(1)
  });
});

app.get("/api/admin/leaderboard", (req, res) => {
  const leaderboard = db.prepare(`
    SELECT 
      a.id, 
      a.name, 
      COUNT(c.id) as total_calls, 
      SUM(c.duration) as total_duration,
      (SELECT COUNT(*) FROM leads l WHERE l.assigned_agent_id = a.id AND l.status = 'Booked') as conversions
    FROM agents a
    LEFT JOIN calls c ON c.agent_id = a.id
    GROUP BY a.id
    ORDER BY conversions DESC, total_calls DESC
  `).all();
  res.json(leaderboard);
});

app.get("/api/admin/top-agents", (req, res) => {
  // Get top 5 agents by conversions (Booked leads) in the last 30 days
  // We assume 'last_interaction' reflects the time of booking for Booked leads
  const topAgents = db.prepare(`
    SELECT 
      a.name, 
      (SELECT COUNT(*) 
       FROM leads l 
       WHERE l.assigned_agent_id = a.id 
       AND l.status = 'Booked'
       AND l.last_interaction >= datetime('now', '-30 days')
      ) as conversions
    FROM agents a
    ORDER BY conversions DESC
    LIMIT 5
  `).all();
  res.json(topAgents);
});

app.get("/api/followups", (req, res) => {
  const followups = db.prepare(`
    SELECT f.*, l.name as lead_name, l.phone as lead_phone, l.temperature, l.trip_interested, l.source
    FROM followups f
    JOIN leads l ON f.lead_id = l.id
    WHERE f.status = 'Pending'
    ORDER BY f.scheduled_at ASC
  `).all();
  res.json(followups);
});

app.post("/api/followups/:id/complete", (req, res) => {
  db.prepare("UPDATE followups SET status = 'Completed' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/followups/:id/reschedule", (req, res) => {
  const { scheduled_at } = req.body;
  db.prepare("UPDATE followups SET scheduled_at = ? WHERE id = ?").run(scheduled_at, req.params.id);
  res.json({ success: true });
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
