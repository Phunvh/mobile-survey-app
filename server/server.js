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

// 0. Root Dashboard - trang chủ hiển thị thống kê trực quan
app.get('/', (req, res) => {
  const responses = readResponses();
  const total = responses.length;
  const urgent = responses.filter(r => r.priority === 'urgent' || r.priority === 'Khẩn cấp').length;
  const highPriority = responses.filter(r => r.priority === 'high' || r.priority === 'Ưu tiên cao').length;
  const latest = responses.slice(0, 5);
  const uptime = Math.floor(process.uptime() / 60);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kiem Tra Co So Vat Chat - Dashboard</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f4f8;color:#1a202c}
  .header{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:24px 32px}
  .header h1{font-size:1.8rem;font-weight:700}
  .header p{opacity:.85;margin-top:4px;font-size:.95rem}
  .dot{display:inline-block;width:10px;height:10px;background:#48bb78;border-radius:50%;margin-right:8px;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .container{max-width:1100px;margin:0 auto;padding:24px 16px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
  .card{background:white;border-radius:12px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,.08)}
  .label{font-size:.8rem;color:#718096;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
  .value{font-size:2rem;font-weight:700}
  .blue .value{color:#4299e1}.red .value{color:#f56565}.orange .value{color:#ed8936}.green .value{color:#48bb78}
  .section{background:white;border-radius:12px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,.08);margin-bottom:16px}
  .section h2{font-size:1rem;font-weight:600;margin-bottom:16px;color:#2d3748;border-bottom:2px solid #e2e8f0;padding-bottom:8px}
  table{width:100%;border-collapse:collapse;font-size:.875rem}
  th{text-align:left;padding:8px 12px;color:#718096;font-weight:500;background:#f7fafc}
  td{padding:10px 12px;border-top:1px solid #e2e8f0}
  tr:hover td{background:#f7fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:.75rem;font-weight:600}
  .br{background:#fff5f5;color:#c53030}.bo{background:#fffaf0;color:#c05621}.bb{background:#ebf8ff;color:#2b6cb0}.bg{background:#f0fff4;color:#276749}
  .api-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .api-item{background:#f7fafc;border-radius:8px;padding:12px;font-family:monospace;font-size:.8rem}
  .get{background:#c6f6d5;color:#276749;padding:2px 6px;border-radius:4px;font-weight:700;margin-right:6px}
  .post{background:#bee3f8;color:#2b6cb0;padding:2px 6px;border-radius:4px;font-weight:700;margin-right:6px}
  .empty{text-align:center;color:#a0aec0;padding:32px}
  .footer{text-align:center;color:#a0aec0;font-size:.8rem;padding:16px}
</style>
</head>
<body>
<div class="header">
  <h1>&#127EB; Kiem Tra Co So Vat Chat Truong Hoc</h1>
  <p><span class="dot"></span>Server dang hoat dong &bull; Uptime: ${uptime} phut &bull; ${new Date().toLocaleString('vi-VN')}</p>
</div>
<div class="container">
  <div class="cards">
    <div class="card blue"><div class="label">Tong phieu kiem tra</div><div class="value">${total}</div></div>
    <div class="card red"><div class="label">Khan cap</div><div class="value">${urgent}</div></div>
    <div class="card orange"><div class="label">Uu tien cao</div><div class="value">${highPriority}</div></div>
    <div class="card green"><div class="label">Server status</div><div class="value" style="font-size:1.2rem">Online</div></div>
  </div>
  <div class="section">
    <h2>Phieu kiem tra moi nhat</h2>
    ${latest.length === 0 ? '<div class="empty">Chua co phieu kiem tra nao duoc gui len</div>' : `
    <table>
      <thead><tr><th>Toa nha / Phong</th><th>Nguoi kiem tra</th><th>Muc do uu tien</th><th>Thoi gian gui</th></tr></thead>
      <tbody>${latest.map(r => {
        const p = r.priority || 'normal';
        let bc = 'bg', bt = 'Binh thuong';
        if (p === 'urgent' || p === 'Khan cap') { bc = 'br'; bt = 'Khan cap'; }
        else if (p === 'high' || p === 'Uu tien cao') { bc = 'bo'; bt = 'Uu tien cao'; }
        else if (p === 'medium' || p === 'Trung binh') { bc = 'bb'; bt = 'Trung binh'; }
        const t = r.serverReceivedAt ? new Date(r.serverReceivedAt).toLocaleString('vi-VN') : 'N/A';
        return '<tr><td><strong>' + (r.building||'') + '</strong><br><small style="color:#718096">' + (r.room||r.location||'') + '</small></td><td>' + (r.inspectorName||r.inspector||'An danh') + '</td><td><span class="badge ' + bc + '">' + bt + '</span></td><td style="color:#718096;font-size:.8rem">' + t + '</td></tr>';
      }).join('')}</tbody>
    </table>`}
  </div>
  <div class="section">
    <h2>API Endpoints</h2>
    <div class="api-grid">
      <div class="api-item"><span class="get">GET</span>/health</div>
      <div class="api-item"><span class="get">GET</span>/api/surveys/responses</div>
      <div class="api-item"><span class="post">POST</span>/api/inspections/submit</div>
      <div class="api-item"><span class="post">POST</span>/api/surveys/batch</div>
      <div class="api-item"><span class="get">GET</span>/api/surveys/stats</div>
      <div class="api-item"><span class="post">POST</span>/api/surveys/submit</div>
    </div>
  </div>
</div>
<div class="footer">Campus Facility Audit Server &bull; Node.js + Express</div>
</body>
</html>`);
});

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
