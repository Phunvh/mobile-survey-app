const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins (mobile apps, different domains)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '25mb' })); // Support base64 photos from camera

// Data directory & storage file
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'responses.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
}

// Atomic helper to read and write responses
function readResponses() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading responses database:', err);
    return [];
  }
}

function writeResponses(data) {
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, DB_FILE);
}

// 1. Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// 2. Submit single survey response
app.post('/api/surveys/submit', (req, res) => {
  try {
    const submission = req.body;
    if (!submission || !submission.id || !submission.surveyId) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ: thiếu id hoặc surveyId' });
    }

    const responses = readResponses();

    // Idempotent check: if already exists, update or ignore
    const existingIndex = responses.findIndex(r => r.id === submission.id);
    const serverTimestamp = new Date().toISOString();

    const record = {
      ...submission,
      serverReceivedAt: serverTimestamp,
      syncStatus: 'synced'
    };

    if (existingIndex >= 0) {
      responses[existingIndex] = record;
      console.log(`[API] Updated existing response: ${submission.id}`);
    } else {
      responses.unshift(record);
      console.log(`[API] Saved new survey response: ${submission.id} (Survey: ${submission.surveyId})`);
    }

    writeResponses(responses);
    return res.json({ success: true, id: submission.id, serverReceivedAt: serverTimestamp });
  } catch (err) {
    console.error('[API] Error saving submission:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lưu phiếu: ' + err.message });
  }
});

// 2b. Submit campus facility inspection
app.post('/api/inspections/submit', (req, res) => {
  try {
    const inspection = req.body;
    if (!inspection || !inspection.id || !inspection.building) {
      return res.status(400).json({ error: 'Thiếu dữ liệu id hoặc building' });
    }

    const responses = readResponses();
    const existingIndex = responses.findIndex(r => r.id === inspection.id);
    const serverTimestamp = new Date().toISOString();

    const record = {
      ...inspection,
      serverReceivedAt: serverTimestamp,
      syncStatus: 'synced'
    };

    if (existingIndex >= 0) {
      responses[existingIndex] = record;
      console.log(`[API] Updated inspection: ${inspection.id}`);
    } else {
      responses.unshift(record);
      console.log(`[API] Saved new Campus Inspection: ${inspection.building} - ${inspection.room}`);
    }

    writeResponses(responses);
    return res.json({ success: true, id: inspection.id, serverReceivedAt: serverTimestamp });
  } catch (err) {
    console.error('[API] Error saving inspection:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ: ' + err.message });
  }
});

// 3. Batch submit for multiple offline responses
app.post('/api/surveys/batch', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Body must contain an array of items' });
    }

    const responses = readResponses();
    let addedCount = 0;
    const serverTimestamp = new Date().toISOString();

    items.forEach(item => {
      const existingIdx = responses.findIndex(r => r.id === item.id);
      const record = {
        ...item,
        serverReceivedAt: serverTimestamp,
        syncStatus: 'synced'
      };
      if (existingIdx >= 0) {
        responses[existingIdx] = record;
      } else {
        responses.unshift(record);
        addedCount++;
      }
    });

    writeResponses(responses);
    console.log(`[API] Batch synced ${items.length} responses (${addedCount} new)`);
    return res.json({ success: true, processed: items.length, added: addedCount });
  } catch (err) {
    console.error('[API] Error in batch sync:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Retrieve all responses (with optional query filters)
app.get('/api/surveys/responses', (req, res) => {
  try {
    const { surveyId } = req.query;
    let list = readResponses();
    if (surveyId) {
      list = list.filter(r => r.surveyId === surveyId);
    }
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Server statistics summary
app.get('/api/surveys/stats', (req, res) => {
  try {
    const list = readResponses();
    const surveyCounts = {};
    list.forEach(r => {
      surveyCounts[r.surveyId] = (surveyCounts[r.surveyId] || 0) + 1;
    });

    return res.json({
      success: true,
      totalResponses: list.length,
      surveyCounts,
      latestSubmission: list[0]?.serverReceivedAt || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Serve frontend static assets if built
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`[Server] Serving PWA frontend from ${distPath}`);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`🚀 Mobile Survey Cloud Server running on port ${PORT}`);
  console.log(`📡 Local:   http://localhost:${PORT}`);
  console.log(`🏥 Health:  http://localhost:${PORT}/health`);
  console.log(`📥 API:     http://localhost:${PORT}/api/surveys/submit`);
  console.log(`===================================================`);
});
