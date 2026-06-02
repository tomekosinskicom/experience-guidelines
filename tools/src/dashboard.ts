/**
 * Sports Experience Guidelines — Web Dashboard
 *
 * A local web UI for managing the guidelines framework.
 * Features: Browse, Preview, Edit, Create, Validate, Search
 *
 * Usage: npx tsx tools/src/dashboard.ts
 * Then open http://localhost:3847
 */

import express from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { generateScaffold } from './scaffold.js';
import { runValidation } from './validate.js';
import { generateManifest } from './manifest-generator.js';
import { search } from './search.js';
import { getExperienceMap } from './experience-map.js';
import { createUploadRouter } from './upload-router.js';
import type { Manifest } from './types.js';

const app = express();
const PORT = 3847;
const ROOT_DIR = path.resolve(process.cwd());

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ──────────────────────────────────────────────────────────────

app.get('/api/manifest', async (_req, res) => {
  try { res.json(await generateManifest(ROOT_DIR)); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const manifest = await generateManifest(ROOT_DIR);
    const results = search(manifest, {
      query: String(req.query.q || ''),
      filters: {
        subdomain: req.query.subdomain ? String(req.query.subdomain).split(',') : undefined,
        status: req.query.status ? String(req.query.status).split(',') : undefined,
      },
    });
    res.json(results);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.get('/api/validate', (_req, res) => {
  try {
    const targetPath = String(_req.query.path || ROOT_DIR);
    const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(ROOT_DIR, targetPath);
    res.json(runValidation({ path: resolvedPath, report: 'json', fix: false }));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post('/api/scaffold', (req, res) => {
  try {
    const { subdomain, area, type, owner } = req.body;
    const result = generateScaffold({ subdomain, area, type, owner });
    const fullPath = path.resolve(ROOT_DIR, result.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, result.content, 'utf-8');
    res.json({ success: true, path: result.path });
  } catch (err: any) { res.status(400).json({ error: err.message || String(err) }); }
});

app.get('/api/document', (req, res) => {
  try {
    const docPath = String(req.query.path || '');
    const fullPath = path.resolve(ROOT_DIR, docPath);
    if (!fs.existsSync(fullPath)) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ path: docPath, content: fs.readFileSync(fullPath, 'utf-8') });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.put('/api/document', (req, res) => {
  try {
    const { path: docPath, content } = req.body;
    if (!docPath || typeof content !== 'string') { res.status(400).json({ error: 'Missing path or content' }); return; }
    const fullPath = path.resolve(ROOT_DIR, docPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true, path: docPath });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post('/api/manifest/generate', async (_req, res) => {
  try {
    const manifest = await generateManifest(ROOT_DIR);
    fs.writeFileSync(path.resolve(ROOT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
    res.json({ success: true, documentCount: manifest.documentCount, relationshipCount: manifest.relationships.length });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// Experience map — full picture including undocumented areas
app.get('/api/experience-map', async (_req, res) => {
  try {
    const manifest = await generateManifest(ROOT_DIR);
    const existingPaths = manifest.documents.map(d => d.path);
    res.json(getExperienceMap(existingPaths));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// Activity — recently updated documents
app.get('/api/activity', async (_req, res) => {
  try {
    const manifest = await generateManifest(ROOT_DIR);
    // Get actual file modification times for real timestamps
    const docsWithTimes = manifest.documents.map(d => {
      const fullPath = path.resolve(ROOT_DIR, d.path);
      let modifiedAt = d.lastUpdated + 'T00:00:00Z';
      try {
        const stat = fs.statSync(fullPath);
        modifiedAt = stat.mtime.toISOString();
      } catch {}
      return { ...d, modifiedAt };
    });
    // Sort by actual modification time descending, take top 15
    const recent = docsWithTimes
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
      .slice(0, 15);
    res.json(recent);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Upload Router ───────────────────────────────────────────────────────────

const uploadRouter = createUploadRouter(ROOT_DIR);
app.use(uploadRouter);

// ─── Serve HTML ──────────────────────────────────────────────────────────────

app.get('/', (_req, res) => { res.send(HTML); });

// Serve static assets (images, etc.) from the repo root
app.use(express.static(ROOT_DIR, { 
  extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'],
  index: false,
}));

// Serve assets referenced with relative paths from markdown files (e.g. /pillars/sports/.../assets/img.png)
app.use((req, res, next) => {
  if (req.method !== 'GET' || !req.path.includes('/assets/')) { next(); return; }
  const reqPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
  // Try direct resolution from root
  const rootPath = path.resolve(ROOT_DIR, reqPath);
  if (fs.existsSync(rootPath)) { res.sendFile(rootPath); return; }
  next();
});

// Catch-all: serve the SPA for deep-links like /sports/discovery/search/research
app.use((req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const p = req.path;
  // Skip API, upload, and static paths
  if (p === '/' || p.startsWith('/api/') || p === '/upload' || p === '/favicon.ico' || p.includes('/assets/')) { next(); return; }
  // Serve the SPA with a deepLink hint embedded
  const deepLink = (p.startsWith('/') ? p.slice(1) : p).replace(/"/g, '\\"');
  const pageHtml = HTML.replace(
    'async function init() {',
    'const __deepLink = "' + deepLink + '";\nasync function init() {'
  ).replace(
    'loadExperienceMap();',
    'loadExperienceMap();\n  if (__deepLink) { setTimeout(function() { openDeepLink(__deepLink); }, 100); }'
  );
  res.send(pageHtml);
});

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Experience Design Guidelines</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f1117;color:#e1e4e8;line-height:1.6;height:100vh;overflow:hidden}
.app{display:grid;grid-template-rows:auto 1fr;height:100vh}
.header{padding:16px 24px;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:16px}
.header h1{font-size:20px;color:#fff}
.header .subtitle{color:#8b949e;font-size:13px}
.main{display:grid;grid-template-columns:300px 1fr;overflow:hidden}
.sidebar{border-right:1px solid #30363d;overflow-y:auto;padding:12px}
.content{overflow-y:auto;padding:16px}
.sidebar-search{width:100%;padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:13px;margin-bottom:12px}
.sidebar-search:focus{outline:none;border-color:#58a6ff}
.tree-item{padding:6px 10px;border-radius:4px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;color:#c9d1d9}
.tree-item:hover{background:#161b22}
.tree-item.active{background:#1f6feb22;color:#58a6ff}
.tree-item .icon{font-size:11px;color:#8b949e}
.tree-group{margin-bottom:4px}
.tree-group-label{padding:6px 10px;font-size:11px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:0.5px}
.toolbar{display:flex;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #30363d;flex-wrap:wrap}
.btn{padding:8px 16px;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s}
.btn-primary{background:#238636;color:#fff}.btn-primary:hover{background:#2ea043}
.btn-secondary{background:#21262d;color:#c9d1d9;border:1px solid #30363d}.btn-secondary:hover{background:#30363d}
.btn-sm{padding:5px 10px;font-size:12px}
.editor-container{display:grid;grid-template-columns:1fr 1fr;gap:16px;height:calc(100vh - 120px);min-height:500px}
.editor-container.preview-only{grid-template-columns:1fr}
.editor-container.edit-only{grid-template-columns:1fr}
.editor-pane,.preview-pane{background:#161b22;border:1px solid #30363d;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;min-height:0}
.pane-header{padding:8px 12px;background:#0d1117;border-bottom:1px solid #30363d;font-size:12px;color:#8b949e;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.editor-textarea{flex:1;width:100%;padding:16px;background:transparent;border:none;color:#e1e4e8;font-family:'JetBrains Mono',Menlo,monospace;font-size:13px;line-height:1.6;resize:none;outline:none;min-height:400px}
.preview-content{flex:1;padding:20px;overflow-y:auto;font-size:14px}
.preview-content h1{font-size:24px;margin-bottom:12px;color:#fff}
.preview-content h2{font-size:18px;margin:20px 0 8px;color:#c9d1d9;border-bottom:1px solid #30363d;padding-bottom:6px}
.preview-content h3{font-size:15px;margin:16px 0 6px;color:#c9d1d9}
.preview-content p{margin-bottom:10px}
.preview-content table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
.preview-content th{text-align:left;padding:8px;border-bottom:1px solid #30363d;color:#8b949e}
.preview-content td{padding:8px;border-bottom:1px solid #21262d}
.preview-content code{background:#0d1117;padding:2px 6px;border-radius:3px;font-size:12px;color:#f0883e}
.preview-content ul,.preview-content ol{padding-left:20px;margin-bottom:10px}
.preview-content li{margin-bottom:4px}
.preview-content blockquote{border-left:3px solid #30363d;padding-left:12px;color:#8b949e;margin:12px 0}
.preview-content hr{border:none;border-top:1px solid #30363d;margin:16px 0}
.preview-content .frontmatter{background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin-bottom:16px;font-family:monospace;font-size:12px;color:#8b949e;white-space:pre-wrap}
.toast{position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:6px;font-size:13px;z-index:1000;animation:slideIn 0.3s}
.toast-success{background:#0d2818;border:1px solid #238636;color:#3fb950}
.toast-error{background:#2d1117;border:1px solid #da3633;color:#f85149}
@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.empty-state{text-align:center;padding:60px 20px;color:#8b949e}
.empty-state h3{color:#c9d1d9;margin-bottom:8px}
.badge{padding:2px 8px;border-radius:12px;font-size:10px;font-weight:500}
.badge-pillar{background:#1b0d2e;color:#a371f7;border:1px solid #a371f7}
.badge-shared{background:#0d2818;color:#3fb950;border:1px solid #238636}
.badge-draft{background:#1c2128;color:#8b949e;border:1px solid #30363d}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <h1 style="cursor:pointer" onclick="showHomepage()">Experience Design Guidelines</h1>
    <span class="subtitle">Cross-Pillar Knowledge Architecture</span>
    <div style="margin-left:auto;display:flex;gap:8px">
      <a href="/upload" class="btn btn-sm btn-secondary" style="text-decoration:none">Upload</a>
      <button class="btn btn-sm btn-secondary" onclick="validateAll()">Validate All</button>
      <button class="btn btn-sm btn-secondary" onclick="regenerateManifest()">Rebuild Manifest</button>
      <button class="btn btn-sm btn-primary" onclick="showCreateDialog()">+ New Document</button>
    </div>
  </div>
  <div class="main">
    <div class="sidebar">
      <input type="text" class="sidebar-search" placeholder="Filter documents..." oninput="filterTree(this.value)">
      <div id="tree"></div>
    </div>
    <div class="content" id="content">
      <div id="homepage">
        <div style="text-align:left;max-width:900px;margin:0 auto;padding:0">
          <h2 style="font-size:20px;color:#fff;margin-bottom:20px;border:none">Recent Activity</h2>
          <div id="activity-list" style="margin-bottom:32px"></div>
          <h2 style="font-size:20px;color:#fff;margin-bottom:20px;border:none">Experience Map</h2>
          <p style="color:#8b949e;margin-bottom:16px;font-size:13px">The full picture of design areas across all pillars. Green = documented, grey = not yet started.</p>
          <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;font-size:11px;color:#8b949e">
            <span>📋 Overview</span><span>💡 Principles</span><span>🧩 Patterns</span><span>🔬 Research</span><span>⚖️ Decisions</span><span>📐 Guidelines</span><span>💎 Examples</span>
          </div>
          <div id="experience-map"></div>
        </div>
      </div>
      <div id="doc-view" style="display:none"></div>
    </div>
  </div>
</div>

<!-- Create Dialog -->
<div id="create-dialog" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:100;display:none;align-items:center;justify-content:center">
  <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;width:520px;max-width:90vw">
    <h2 style="font-size:18px;margin-bottom:16px;color:#fff">Add Document</h2>
    <!-- Tabs -->
    <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:1px solid #30363d">
      <button id="tab-scaffold" class="btn btn-sm" style="border-radius:6px 6px 0 0;border-bottom:2px solid #58a6ff;color:#58a6ff;background:transparent;padding:8px 16px" onclick="switchCreateTab('scaffold')">Create from Scratch</button>
      <button id="tab-upload" class="btn btn-sm" style="border-radius:6px 6px 0 0;border-bottom:2px solid transparent;color:#8b949e;background:transparent;padding:8px 16px" onclick="switchCreateTab('upload')">Import from File</button>
    </div>
    <!-- Scaffold Tab -->
    <div id="create-tab-scaffold">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div><label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px">Pillar</label>
        <select id="c-pillar" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:13px">
          <option value="pillars/sports">Sports</option><option value="pillars/gaming">Gaming</option><option value="pillars/player-experience">Player Experience</option><option value="shared">Shared</option>
        </select></div>
      <div><label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px">Subdomain</label>
        <select id="c-subdomain" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:13px">
          <option value="discovery">Discovery</option><option value="transactional">Transactional</option><option value="post-bet">Post Bet</option><option value="retail">Retail</option><option value="tools">Tools</option><option value="cross-cutting-areas">Cross-Cutting</option>
        </select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div><label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px">Experience Area</label>
        <input id="c-area" type="text" placeholder="e.g. betslip, live-betting" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:13px"></div>
      <div><label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px">Document Type</label>
        <select id="c-type" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:13px">
          <option value="overview">Overview</option><option value="principles">Principles</option><option value="patterns">Patterns</option><option value="research">Research</option><option value="decisions">Decisions</option><option value="guidelines">Guidelines</option><option value="examples">Examples</option>
        </select></div>
    </div>
    <div style="margin-bottom:16px"><label style="font-size:12px;color:#8b949e;display:block;margin-bottom:4px">Lead Designer</label>
      <input id="c-owner" type="text" placeholder="e.g. Tomek Osinski, Agnes Smith" style="width:100%;padding:8px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e1e4e8;font-size:13px"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="hideCreateDialog()">Cancel</button>
      <button class="btn btn-primary" onclick="createDocument()">Create</button>
    </div>
    <div id="create-result" style="margin-top:12px"></div>
    </div>
    <!-- Upload Tab -->
    <div id="create-tab-upload" style="display:none">
      <div id="modal-upload-zone" style="border:2px dashed #30363d;border-radius:10px;padding:36px 24px;text-align:center;cursor:pointer;transition:all 0.2s;background:#0d1117" ondragover="event.preventDefault();this.style.borderColor='#58a6ff';this.style.background='#1f6feb22'" ondragleave="this.style.borderColor='#30363d';this.style.background='#0d1117'" ondrop="handleModalDrop(event)">
        <div style="font-size:36px;margin-bottom:12px;opacity:0.6">📄</div>
        <div style="font-size:14px;color:#c9d1d9;margin-bottom:6px">Drop a file here to import</div>
        <div style="font-size:12px;color:#8b949e;margin-bottom:12px">or</div>
        <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('modal-file-input').click()">Choose File</button>
        <input type="file" id="modal-file-input" accept=".pdf,.txt,.text,.md,.markdown" style="display:none" onchange="handleModalFileSelect(this)">
        <div style="font-size:11px;color:#8b949e;margin-top:12px;padding-top:10px;border-top:1px solid #30363d">.pdf, .txt, .text, .md, .markdown &middot; Max 20 MB</div>
      </div>
      <div id="modal-upload-progress" style="display:none;text-align:center;padding:24px">
        <div style="width:28px;height:28px;border:3px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 10px"></div>
        <div id="modal-upload-status" style="font-size:13px;color:#8b949e">Processing…</div>
      </div>
      <div id="modal-upload-error" style="display:none;margin-top:12px;padding:10px 14px;background:#2d1117;border:1px solid #da3633;border-radius:6px;color:#f85149;font-size:13px"></div>
      <div id="modal-upload-success" style="display:none;margin-top:12px;text-align:center;padding:16px">
        <div style="font-size:28px;color:#3fb950;margin-bottom:8px">✓</div>
        <div style="font-size:14px;color:#c9d1d9;margin-bottom:4px">Document imported successfully</div>
        <div id="modal-upload-path" style="font-size:12px;color:#8b949e"></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-secondary" onclick="hideCreateDialog()">Close</button>
        <a href="/upload" class="btn btn-sm btn-secondary" style="text-decoration:none">Advanced Upload →</a>
      </div>
    </div>
  </div>
</div>

<script>
let docs = [];
let experienceMapData = null;
let currentDoc = null;
let editMode = false;
let navHistory = []; // Stack of {type, path/params} for back navigation

async function init() {
  const [manifestRes, mapRes] = await Promise.all([
    fetch('/api/manifest'),
    fetch('/api/experience-map')
  ]);
  const manifest = await manifestRes.json();
  experienceMapData = await mapRes.json();
  docs = manifest.documents;
  renderTree(docs, experienceMapData);
  loadActivity();
  loadExperienceMap();
}

function renderTree(items, mapData) {
  const typeIcons = { overview: '📋', principles: '💡', patterns: '🧩', research: '🔬', decisions: '⚖️', guidelines: '📐', examples: '💎' };
  const map = mapData || experienceMapData;

  function renderDocItem(d, indent) {
    const icon = typeIcons[d.documentType] || '📄';
    const typeBadge = d.documentType ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#21262d;color:#8b949e;margin-left:auto">' + d.documentType + '</span>' : '';
    const displayName = d.title || d.experienceArea || d.path.split('/').pop();
    return '<div class="tree-item" data-path="' + d.path + '" onclick="openDoc(\\'' + d.path + '\\')" title="' + d.path + '" style="padding-left:' + indent + 'px">' +
      '<span class="icon">' + icon + '</span>' +
      '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + displayName + '</span>' +
      typeBadge + '</div>';
  }

  function renderPlaceholderItem(name, indent) {
    return '<div class="tree-item" style="padding-left:' + indent + 'px;opacity:0.4;cursor:default" title="Not documented yet">' +
      '<span class="icon">○</span>' +
      '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + name + '</span>' +
      '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#21262d33;color:#484f58;margin-left:auto">—</span>' +
      '</div>';
  }

  let html = '';

  if (map && map.pillars) {
    map.pillars.forEach(pillar => {
      const isExpanded = pillar.slug === 'sports';
      const pillarKey = 'pillars/' + pillar.slug;
      const pillarDocs = items.filter(d => d.path.startsWith(pillarKey + '/'));
      const pillarIndex = pillarDocs.find(d => d.path === pillarKey + '/index.md');
      const pillarRootDocs = pillarDocs.filter(d => {
        const rel = d.path.slice(pillarKey.length + 1);
        return !rel.includes('/') && d !== pillarIndex;
      });

      html += '<div class="tree-group">';
      html += '<div class="tree-group-label" onclick="toggleGroup(this)" style="cursor:pointer;user-select:none">';
      html += '<span class="toggle-icon">' + (isExpanded ? '▼' : '▶') + '</span> ' + pillar.icon + ' ' + pillar.name;
      html += '</div>';
      html += '<div class="tree-children"' + (isExpanded ? '' : ' style="display:none"') + '>';

      // Pillar index + root docs
      if (pillarIndex) html += renderDocItem(pillarIndex, 22);
      pillarRootDocs.forEach(d => { html += renderDocItem(d, 22); });

      // Subdomains from the experience map
      pillar.subdomains.forEach(sub => {
        html += '<div class="tree-group" style="padding-left:10px">';
        html += '<div class="tree-group-label" style="cursor:pointer;user-select:none;font-size:11px;padding:4px 10px;display:flex;align-items:center;gap:4px">';
        html += '<span class="toggle-icon" onclick="event.stopPropagation();toggleGroup(this.parentElement)">▶</span>';
        html += '<span onclick="event.stopPropagation();openLobby(\\'' + pillar.slug + '\\',\\'' + sub.slug + '\\',null)" style="flex:1">' + sub.name + '</span>';
        const documented = sub.areas.filter(a => a.documented).length;
        html += ' <span style="font-size:9px;color:#484f58">(' + documented + '/' + sub.areas.length + ')</span>';
        html += '</div>';
        html += '<div class="tree-children" style="display:none">';

        // Subdomain index doc
        const subKey = pillarKey + '/' + sub.slug;
        const subIndex = pillarDocs.find(d => d.path === subKey + '/index.md');
        if (subIndex) html += renderDocItem(subIndex, 32);

        // Experience areas from the map
        sub.areas.forEach(area => {
          const areaSlug = area.slug;
          const areaDocs = pillarDocs.filter(d => {
            const rel = d.path.slice(subKey.length + 1);
            return rel.startsWith(areaSlug + '/');
          });

          if (areaDocs.length > 0) {
            // Documented area — show as clickable item linking to lobby
            html += '<div class="tree-item" style="padding-left:32px;cursor:pointer" onclick="openLobby(\\'' + pillar.slug + '\\',\\'' + sub.slug + '\\',\\'' + areaSlug + '\\')">';
            html += '<span class="icon" style="color:#7ee787">●</span>';
            html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + area.name + '</span>';
            html += '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#21262d;color:#8b949e;margin-left:auto">' + areaDocs.length + '</span>';
            html += '</div>';
          } else {
            // Placeholder — area exists in map but no docs yet — clicking opens lobby
            html += '<div class="tree-item" style="padding-left:32px;opacity:0.6;cursor:pointer" title="No documents yet" onclick="openLobby(\\'' + pillar.slug + '\\',\\'' + sub.slug + '\\',\\'' + area.slug + '\\')">';
            html += '<span class="icon">○</span>';
            html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + area.name + '</span>';
            html += '</div>';
          }
        });

        html += '</div></div>';
      });

      html += '</div></div>';
    });
  }

  // Shared
  if (map && map.shared) {
    html += '<div class="tree-group">';
    html += '<div class="tree-group-label" onclick="toggleGroup(this)" style="cursor:pointer;user-select:none">';
    html += '<span class="toggle-icon">▶</span> 🔗 Shared';
    html += '</div>';
    html += '<div class="tree-children" style="display:none">';
    const sharedDocs = items.filter(d => d.path.startsWith('shared/'));
    if (sharedDocs.length > 0) {
      sharedDocs.forEach(d => { html += renderDocItem(d, 22); });
    }
    map.shared.forEach(area => {
      if (!area.documented) html += renderPlaceholderItem(area.name, 22);
    });
    html += '</div></div>';
  }

  // Principles
  const principlesDocs = items.filter(d => d.path.startsWith('principles/'));
  if (principlesDocs.length > 0) {
    html += '<div class="tree-group">';
    html += '<div class="tree-group-label" onclick="toggleGroup(this)" style="cursor:pointer;user-select:none">';
    html += '<span class="toggle-icon">▶</span> 💡 Principles';
    html += '</div>';
    html += '<div class="tree-children" style="display:none">';
    principlesDocs.forEach(d => { html += renderDocItem(d, 22); });
    html += '</div></div>';
  }

  // Root docs
  const rootDocs = items.filter(d => !d.path.includes('/'));
  if (rootDocs.length > 0) {
    html += '<div class="tree-group"><div class="tree-group-label" style="font-size:10px;color:#484f58">Root</div>';
    rootDocs.forEach(d => { html += renderDocItem(d, 10); });
    html += '</div>';
  }

  document.getElementById('tree').innerHTML = html;
}

function toggleGroup(el) {
  const children = el.nextElementSibling;
  const icon = el.querySelector('.toggle-icon');
  if (children.style.display === 'none') {
    children.style.display = 'block';
    icon.textContent = '▼';
  } else {
    children.style.display = 'none';
    icon.textContent = '▶';
  }
}

async function openLobby(pillarSlug, subdomainSlug, areaSlug, skipHistory) {
  // Push current state to history
  if (!skipHistory && currentDoc) {
    navHistory.push({ type: 'doc', path: currentDoc.path });
  } else if (!skipHistory && !currentDoc) {
    navHistory.push({ type: 'home' });
  }

  // Hide homepage, show doc view
  document.getElementById('homepage').style.display = 'none';
  const el = document.getElementById('doc-view');
  el.style.display = 'block';
  currentDoc = null;

  const typeIcons = { overview: '📋', principles: '💡', patterns: '🧩', research: '🔬', decisions: '⚖️', guidelines: '📐', examples: '💎' };
  const pillarKey = 'pillars/' + pillarSlug;
  const subKey = pillarKey + '/' + subdomainSlug;
  const basePath = areaSlug ? subKey + '/' + areaSlug : subKey;

  // Find matching documents
  const matchingDocs = docs.filter(d => d.path.startsWith(basePath + '/'));

  // Determine lobby title
  let lobbyTitle = areaSlug
    ? areaSlug.replace(/-/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase())
    : subdomainSlug.replace(/-/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase());

  // Try to load index.md content
  let indexContent = '';
  const indexPath = basePath + '/index.md';
  const indexDoc = matchingDocs.find(d => d.path === indexPath);
  if (indexDoc) {
    try {
      const res = await fetch('/api/document?path=' + encodeURIComponent(indexPath));
      const data = await res.json();
      if (data.content) indexContent = renderMarkdown(data.content);
    } catch(e) {}
  }

  // Sort by last updated (most recent first)
  const sortedDocs = [...matchingDocs].sort((a, b) => (b.lastUpdated || '').localeCompare(a.lastUpdated || ''));
  const recentDocs = sortedDocs.slice(0, 5);
  const otherDocs = matchingDocs.filter(d => d.path !== indexPath);

  // Build breadcrumbs for lobby
  var lobbyBreadcrumbs = '<span style="font-size:12px;color:#8b949e;display:flex;align-items:center;gap:4px;flex-wrap:wrap">';
  lobbyBreadcrumbs += '<a href="#" onclick="event.preventDefault();showHomepage()" style="color:#58a6ff;text-decoration:none">Home</a>';
  lobbyBreadcrumbs += ' <span style="color:#484f58">/</span> ';
  var pillarLabel = pillarSlug.replace(/-/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
  lobbyBreadcrumbs += '<span style="color:#c9d1d9">' + pillarLabel + '</span>';
  lobbyBreadcrumbs += ' <span style="color:#484f58">/</span> ';
  var subLabel = subdomainSlug.replace(/-/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
  if (areaSlug) {
    lobbyBreadcrumbs += '<a href="#" onclick="event.preventDefault();openLobby(\\'' + pillarSlug + '\\',\\'' + subdomainSlug + '\\',null)" style="color:#58a6ff;text-decoration:none">' + subLabel + '</a>';
    lobbyBreadcrumbs += ' <span style="color:#484f58">/</span> ';
    lobbyBreadcrumbs += '<span style="color:#c9d1d9;font-weight:500">' + lobbyTitle + '</span>';
  } else {
    lobbyBreadcrumbs += '<span style="color:#c9d1d9;font-weight:500">' + subLabel + '</span>';
  }
  lobbyBreadcrumbs += '</span>';

  // Build lobby HTML
  let html = '<div class="toolbar">';
  html += '<button class="btn btn-sm btn-secondary" onclick="goBack()">← Back</button>';
  html += '</div>';
  html += '<div style="margin-bottom:12px">' + lobbyBreadcrumbs + '</div>';

  html += '<div style="max-width:900px">';
  html += '<h1 style="font-size:24px;color:#fff;margin-bottom:8px">' + lobbyTitle + '</h1>';
  html += '<p style="color:#8b949e;font-size:13px;margin-bottom:24px">' + matchingDocs.length + ' document' + (matchingDocs.length !== 1 ? 's' : '') + ' in this area</p>';

  // Index content
  if (indexContent) {
    html += '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;margin-bottom:24px">';
    html += '<div class="preview-content">' + indexContent + '</div>';
    html += '</div>';
  }

  // Overview intro — if an overview.md exists for this area, show its intro
  let overviewIntroHtml = '';
  if (areaSlug) {
    const overviewPath = basePath + '/overview.md';
    const overviewDoc = matchingDocs.find(d => d.path === overviewPath);
    if (overviewDoc) {
      try {
        const res = await fetch('/api/document?path=' + encodeURIComponent(overviewPath));
        const data = await res.json();
        if (data.content) {
          // Extract intro: content between first ## Overview and the next ## heading
          const bodyStart = data.content.indexOf('\\n## ');
          if (bodyStart !== -1) {
            const afterFirstHeading = data.content.indexOf('\\n', bodyStart + 4);
            const nextHeading = data.content.indexOf('\\n## ', afterFirstHeading);
            const introBody = nextHeading !== -1
              ? data.content.slice(afterFirstHeading, nextHeading).trim()
              : data.content.slice(afterFirstHeading).trim().split('\\n\\n').slice(0, 3).join('\\n\\n');
            if (introBody.length > 0) {
              overviewIntroHtml += '<div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:20px;margin-bottom:24px">';
              overviewIntroHtml += '<div class="preview-content" style="font-size:14px">' + renderMarkdown(introBody) + '</div>';
              overviewIntroHtml += '<a href="#" onclick="event.preventDefault();openDoc(\\'' + overviewPath + '\\')" style="display:inline-block;margin-top:12px;font-size:13px;color:#58a6ff;text-decoration:none">Read full overview →</a>';
              overviewIntroHtml += '</div>';
            }
          }
        }
      } catch(e) {}
    }
  }
  if (overviewIntroHtml) html += overviewIntroHtml;

  // Recently updated
  if (recentDocs.length > 0) {
    html += '<h2 style="font-size:16px;color:#c9d1d9;margin-bottom:12px;border:none">Recently Updated</h2>';
    html += '<div style="display:grid;gap:8px;margin-bottom:24px">';
    recentDocs.forEach(d => {
      const icon = typeIcons[d.documentType] || '📄';
      const title = d.title || d.path.split('/').pop();
      html += '<div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:border-color 0.15s" onclick="openDoc(\\'' + d.path + '\\')" onmouseenter="this.style.borderColor=\\'#58a6ff\\'" onmouseleave="this.style.borderColor=\\'#30363d\\'">';
      html += '<span style="font-size:16px">' + icon + '</span>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:13px;color:#e1e4e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + title + '</div>';
      html += '<div style="font-size:11px;color:#8b949e">' + (d.documentType || 'document') + (d.lastUpdated ? ' · ' + d.lastUpdated : '') + '</div>';
      html += '</div>';
      html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#21262d;color:#8b949e">' + (d.status || 'draft') + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // All documents
  if (otherDocs.length > 0) {
    html += '<h2 style="font-size:16px;color:#c9d1d9;margin-bottom:12px;border:none">All Documents</h2>';
    html += '<div style="display:grid;gap:6px;margin-bottom:24px">';
    otherDocs.forEach(d => {
      const icon = typeIcons[d.documentType] || '📄';
      const title = d.title || d.path.split('/').pop();
      html += '<div style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:4px;transition:background 0.15s" onclick="openDoc(\\'' + d.path + '\\')" onmouseenter="this.style.background=\\'#161b22\\'" onmouseleave="this.style.background=\\'transparent\\'">';
      html += '<span style="font-size:14px">' + icon + '</span>';
      html += '<span style="font-size:13px;color:#c9d1d9;flex:1">' + title + '</span>';
      html += '<span style="font-size:11px;color:#484f58">' + (d.documentType || '') + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // Empty state
  if (matchingDocs.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:#8b949e">';
    html += '<div style="font-size:32px;margin-bottom:12px;opacity:0.5">📂</div>';
    html += '<p>No documents in this area yet.</p>';
    html += '<p style="font-size:12px;margin-top:8px">Click "+ New Document" to create one.</p>';
    html += '</div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

function filterTree(query) {
  const q = query.toLowerCase();
  const filtered = q ? docs.filter(d => d.path.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.tags.some(t => t.includes(q))) : docs;
  renderTree(filtered);
}

async function openDoc(docPath, skipHistory) {
  // Push current state to history before navigating
  if (!skipHistory) {
    if (currentDoc) {
      navHistory.push({ type: 'doc', path: currentDoc.path });
    } else if (document.getElementById('doc-view').style.display === 'block') {
      // We're on a lobby page — try to extract lobby params from URL
      var urlPath = window.location.pathname.slice(1);
      var urlParts = urlPath.split('/');
      if (urlParts.length >= 2) {
        navHistory.push({ type: 'lobby', pillarSlug: urlParts[0], subdomainSlug: urlParts[1], areaSlug: urlParts[2] || null });
      } else {
        navHistory.push({ type: 'home' });
      }
    }
  }

  document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
  document.querySelector('[data-path="' + docPath + '"]')?.classList.add('active');

  const res = await fetch('/api/document?path=' + encodeURIComponent(docPath));
  const data = await res.json();
  currentDoc = data;
  editMode = false;
  renderDocument();

  // Update URL to match document path
  var urlPath = docPath.replace(/^pillars\\//, '').replace(/\\.md$/, '').replace(/\\/index$/, '');
  history.pushState({ docPath: docPath }, '', '/' + urlPath);
}

function navigateToDoc(href) {
  if (!currentDoc || !currentDoc.path) return;

  const currentDir = currentDoc.path.split('/').slice(0, -1).join('/');
  let resolved = href;

  // If it's already an absolute path in the repo, use it directly
  if (!href.startsWith('pillars/') && !href.startsWith('shared/') && !href.startsWith('principles/') && !href.startsWith('index')) {
    // It's a relative path — resolve from current directory
    resolved = currentDir + '/' + href;
  }

  // Resolve ../ segments
  const parts = resolved.split('/');
  const normalized = [];
  for (const part of parts) {
    if (part === '..') {
      normalized.pop();
    } else if (part !== '.' && part !== '') {
      normalized.push(part);
    }
  }
  resolved = normalized.join('/');

  // Remove trailing slash
  resolved = resolved.replace(/\\/+$/, '');

  // If it doesn't end with .md, try to find the file
  if (!resolved.endsWith('.md') && !resolved.endsWith('.yaml')) {
    // Try index.md first, then overview.md
    const candidates = [resolved + '/index.md', resolved + '/overview.md', resolved + '.md'];
    const found = docs.find(d => candidates.includes(d.path));
    if (found) {
      resolved = found.path;
    } else {
      resolved += '/index.md';
    }
  }

  openDoc(resolved);
}

function renderDocument() {
  if (!currentDoc) return;

  // Hide homepage, show doc view
  document.getElementById('homepage').style.display = 'none';
  const el = document.getElementById('doc-view');
  el.style.display = 'block';

  // Build TOC from ## headings
  var toc = '';
  if (!editMode && currentDoc.content) {
    var tocItems = [];
    var lines = currentDoc.content.split('\\n');
    for (var li = 0; li < lines.length; li++) {
      var hMatch = lines[li].match(/^(#{2,3})\\s+(.+)/);
      if (hMatch) {
        var hLevel = hMatch[1].length;
        var hText = hMatch[2].replace(/\\*\\*/g, '').replace(/\\*/g, '');
        var hId = hText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        tocItems.push({ level: hLevel, text: hText, id: hId });
      }
    }
    if (tocItems.length > 1) {
      toc = '<div style="position:sticky;top:0;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px 16px;margin-bottom:16px;max-height:50vh;overflow-y:auto">';
      toc += '<div style="font-size:11px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">On this page</div>';
      tocItems.forEach(function(item) {
        var indent = item.level === 3 ? 'padding-left:12px;' : '';
        toc += '<a href="#' + item.id + '" onclick="event.preventDefault();document.getElementById(\\'' + item.id + '\\').scrollIntoView({behavior:\\'smooth\\',block:\\'start\\'})" style="display:block;font-size:12px;color:#8b949e;text-decoration:none;padding:3px 0;' + indent + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis" onmouseenter="this.style.color=\\'#58a6ff\\'" onmouseleave="this.style.color=\\'#8b949e\\'">' + escapeHtml(item.text) + '</a>';
      });
      toc += '</div>';
    }
  }

  el.innerHTML = '<div class="toolbar">' +
    '<button class="btn btn-sm btn-secondary" onclick="goBack()">← Back</button>' +
    '<button class="btn btn-sm ' + (editMode ? 'btn-secondary' : 'btn-primary') + '" onclick="togglePreview()">Preview</button>' +
    '<button class="btn btn-sm ' + (editMode ? 'btn-primary' : 'btn-secondary') + '" onclick="toggleEdit()">Edit</button>' +
    '<button class="btn btn-sm btn-secondary" onclick="toggleSplit()">Split</button>' +
    (editMode ? '<button class="btn btn-sm btn-primary" onclick="saveDoc()">Save</button>' : '') +
    '</div>' +
    '<div style="margin-bottom:12px">' + buildBreadcrumbs(currentDoc.path) + '</div>' +
    '<div class="editor-container ' + (editMode ? 'edit-only' : 'preview-only') + '" id="editor-area">' +
    (editMode ? '<div class="editor-pane"><div class="pane-header">Markdown Editor</div><textarea class="editor-textarea" id="editor" oninput="updatePreview()">' + escapeHtml(currentDoc.content) + '</textarea></div>' : '') +
    '<div class="preview-pane"><div class="pane-header">Preview</div><div class="preview-content" id="preview" style="display:flex;gap:20px;align-items:flex-start"><div style="flex:1;min-width:0">' + renderContent(currentDoc.path, currentDoc.content) + '</div>' + (toc ? '<div style="flex:0 0 180px;position:sticky;top:16px">' + toc + '</div>' : '') + '</div></div>' +
    '</div>';
}

function togglePreview() { editMode = false; renderDocument(); }
function toggleEdit() { editMode = true; renderDocument(); }
function toggleSplit() {
  editMode = true;
  renderDocument();
  const area = document.getElementById('editor-area');
  area.classList.remove('edit-only', 'preview-only');
}

function updatePreview() {
  const editor = document.getElementById('editor');
  if (editor) {
    currentDoc.content = editor.value;
    const preview = document.getElementById('preview');
    if (preview) preview.innerHTML = renderContent(currentDoc.path, editor.value);
  }
}

async function saveDoc() {
  const editor = document.getElementById('editor');
  if (!editor || !currentDoc) return;

  const res = await fetch('/api/document', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: currentDoc.path, content: editor.value }),
  });
  const data = await res.json();
  if (data.success) {
    showToast('Saved: ' + currentDoc.path, 'success');
    currentDoc.content = editor.value;
  } else {
    showToast('Error: ' + data.error, 'error');
  }
}

function renderContent(path, content) {
  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    return renderYaml(content);
  }
  return renderMarkdown(content);
}

function renderYaml(yaml) {
  // Parse YAML into a human-friendly card layout
  var html = '';
  var lines = yaml.split('\\n');
  var currentKey = '';
  var items = [];
  var currentItem = {};

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    // Top-level key (no indent, ends with :)
    if (line.match(/^[a-zA-Z_-]+:/) && !line.match(/^\\s/)) {
      // Flush previous section
      if (currentKey && items.length > 0) {
        html += renderYamlSection(currentKey, items);
        items = [];
      }
      currentKey = line.replace(/:.*$/, '').trim();
      var inlineVal = line.replace(/^[^:]+:\\s*/, '').trim();
      if (inlineVal && !inlineVal.startsWith('[') && inlineVal !== '') {
        html += '<div style="margin-bottom:16px"><span style="font-size:11px;text-transform:uppercase;color:#8b949e;letter-spacing:0.5px">' + escapeHtml(currentKey) + '</span><div style="font-size:14px;color:#e1e4e8;margin-top:4px">' + escapeHtml(inlineVal) + '</div></div>';
        currentKey = '';
      }
      currentItem = {};
      continue;
    }
    // Array item start
    if (line.match(/^\\s+-\\s+/)) {
      if (Object.keys(currentItem).length > 0) items.push(currentItem);
      currentItem = {};
      var firstField = line.replace(/^\\s+-\\s+/, '');
      var colonIdx = firstField.indexOf(':');
      if (colonIdx > 0) {
        var k = firstField.slice(0, colonIdx).trim();
        var v = firstField.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
        currentItem[k] = v;
      }
      continue;
    }
    // Continuation field within array item
    if (line.match(/^\\s{4,}[a-zA-Z_-]+:/) || line.match(/^\\s{2,}[a-zA-Z_-]+:/)) {
      var stripped = line.trim();
      var ci = stripped.indexOf(':');
      if (ci > 0) {
        var fk = stripped.slice(0, ci).trim();
        var fv = stripped.slice(ci + 1).trim().replace(/^["']|["']$/g, '');
        // Handle arrays like ["a", "b"]
        if (fv.startsWith('[')) {
          fv = fv.replace(/^\\[|\\]$/g, '').replace(/["']/g, '');
        }
        currentItem[fk] = fv;
      }
    }
  }
  // Flush last section
  if (Object.keys(currentItem).length > 0) items.push(currentItem);
  if (currentKey && items.length > 0) {
    html += renderYamlSection(currentKey, items);
  }

  if (!html) {
    // Fallback: just show as formatted code
    html = '<pre style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:16px;color:#e1e4e8;font-size:13px;white-space:pre-wrap">' + escapeHtml(yaml) + '</pre>';
  }

  return html;
}

function renderYamlSection(key, items) {
  var html = '<div style="margin-bottom:24px">';
  html += '<h2 style="font-size:16px;color:#fff;margin-bottom:12px;text-transform:capitalize;border:none">' + escapeHtml(key.replace(/[-_]/g, ' ')) + '</h2>';
  html += '<div style="display:grid;gap:8px">';
  items.forEach(function(item) {
    html += '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px 16px;display:flex;align-items:center;gap:12px">';
    // Name as primary field
    var name = item.name || item.title || Object.values(item)[0] || '';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:14px;color:#e1e4e8;font-weight:500">' + escapeHtml(String(name)) + '</div>';
    // Role or secondary info
    if (item.role) {
      html += '<div style="font-size:12px;color:#8b949e;margin-top:2px">' + escapeHtml(item.role) + '</div>';
    }
    html += '</div>';
    // Areas/tags
    if (item.areas) {
      var areas = item.areas.split(',').map(function(a) { return a.trim(); });
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      areas.forEach(function(a) {
        if (a) html += '<span style="padding:2px 8px;border-radius:10px;font-size:10px;background:#21262d;color:#8b949e;border:1px solid #30363d">' + escapeHtml(a) + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function renderMarkdown(md) {
  // Extract frontmatter
  let body = md;
  let fm = '';
  if (md.startsWith('---')) {
    const end = md.indexOf('---', 3);
    if (end !== -1) {
      fm = md.slice(3, end).trim();
      body = md.slice(end + 3).trim();
    }
  }

  let html = '';
  if (fm) {
    // Parse YAML frontmatter into a styled header card
    var fmFields = {};
    var fmTags = [];
    fm.split('\\n').forEach(function(line) {
      if (line.trim().startsWith('- ')) {
        fmTags.push(line.trim().replace(/^- /, '').replace(/^["']|["']$/g, ''));
        return;
      }
      var colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        var key = line.slice(0, colonIdx).trim();
        var val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key === 'tags') return;
        fmFields[key] = val;
      }
    });

    html += '<div style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin-bottom:20px">';
    // Title row
    if (fmFields.title) {
      html += '<div style="font-size:11px;text-transform:uppercase;color:#8b949e;letter-spacing:0.5px;margin-bottom:4px">' + (fmFields['document-type'] || 'Document') + '</div>';
      html += '<h1 style="font-size:20px;color:#fff;margin:0 0 12px;border:none">' + escapeHtml(fmFields.title) + '</h1>';
    }
    // Summary
    if (fmFields.summary) {
      html += '<p style="font-size:13px;color:#c9d1d9;margin-bottom:14px;line-height:1.5">' + escapeHtml(fmFields.summary) + '</p>';
    }
    // Metadata grid
    html += '<div style="display:flex;flex-wrap:wrap;gap:16px;font-size:12px;margin-bottom:12px">';
    if (fmFields.subdomain) html += '<div><span style="color:#8b949e">Subdomain</span> <span style="color:#c9d1d9;margin-left:4px">' + escapeHtml(fmFields.subdomain) + '</span></div>';
    if (fmFields['experience-area']) html += '<div><span style="color:#8b949e">Area</span> <span style="color:#c9d1d9;margin-left:4px">' + escapeHtml(fmFields['experience-area']) + '</span></div>';
    if (fmFields.owner) html += '<div><span style="color:#8b949e">Owner</span> <span style="color:#c9d1d9;margin-left:4px">' + escapeHtml(fmFields.owner) + '</span></div>';
    if (fmFields['last-updated']) html += '<div><span style="color:#8b949e">Updated</span> <span style="color:#c9d1d9;margin-left:4px">' + escapeHtml(fmFields['last-updated']) + '</span></div>';
    if (fmFields.status) {
      var statusColor = fmFields.status === 'published' ? '#3fb950' : fmFields.status === 'draft' ? '#8b949e' : '#d29922';
      html += '<div><span style="color:#8b949e">Status</span> <span style="color:' + statusColor + ';margin-left:4px;font-weight:500">' + escapeHtml(fmFields.status) + '</span></div>';
    }
    html += '</div>';
    // Tags
    if (fmTags.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      fmTags.forEach(function(tag) {
        html += '<span style="padding:2px 8px;border-radius:10px;font-size:11px;background:#21262d;color:#8b949e;border:1px solid #30363d">' + escapeHtml(tag) + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // Line-by-line markdown rendering
  const lines = body.split('\\n');
  let i = 0;
  let inCodeBlock = false;
  let codeContent = '';

  function inline(text) {
    return text
      .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
      .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
      .replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g, function(m, alt, src) {
        // Resolve relative image paths
        var imgSrc = src;
        if (src.startsWith('./') || (!src.startsWith('http') && !src.startsWith('/'))) {
          // Relative path — resolve from current doc directory
          var docDir = (currentDoc && currentDoc.path) ? currentDoc.path.split('/').slice(0, -1).join('/') : '';
          imgSrc = '/' + docDir + '/' + src.replace(/^\\.\\//,'');
        }
        return '<img src="' + imgSrc + '" alt="' + alt + '" style="max-width:100%;border-radius:8px;margin:12px 0;border:1px solid #30363d">';
      })
      .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, function(m, t, href) {
        if (href.endsWith('.md') || href.endsWith('.yaml') || href.endsWith('.yml') || href.endsWith('/')) {
          return '<a href="#" onclick="event.preventDefault();navigateToDoc(\\'' + href + '\\')" style="color:#58a6ff;text-decoration:none;border-bottom:1px solid #58a6ff33">' + t + '</a>';
        }
        return '<a href="' + href + '" target="_blank" style="color:#58a6ff;text-decoration:none">' + t + '</a>';
      });
  }

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('\`\`\`')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeContent = '';
        i++;
        continue;
      } else {
        inCodeBlock = false;
        html += '<pre style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;overflow-x:auto;font-size:12px;color:#e1e4e8;margin:12px 0"><code>' + escapeHtml(codeContent) + '</code></pre>';
        i++;
        continue;
      }
    }
    if (inCodeBlock) {
      codeContent += (codeContent ? '\\n' : '') + line;
      i++;
      continue;
    }

    // Comments
    if (line.trim().startsWith('<!--')) {
      // Skip until end of comment
      let commentLine = line;
      while (i < lines.length && !commentLine.includes('-->')) {
        i++;
        if (i < lines.length) commentLine = lines[i];
      }
      i++;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\\s+(.+)/);
    if (h) {
      const level = h[1].length;
      const headingId = h[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      html += '<h' + level + ' id="' + headingId + '">' + inline(h[2]) + '</h' + level + '>';
      i++;
      continue;
    }

    // Horizontal rules
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      html += '<hr>';
      i++;
      continue;
    }

    // Unordered lists (supports nesting via indentation)
    if (line.match(/^(\\s*)[-*]\\s+(.)/)) {
      html += parseList(lines, i, 'ul');
      // Advance past all list lines
      while (i < lines.length && (lines[i].match(/^(\\s*)[-*]\\s+(.)+/) || (lines[i].match(/^\\s{2,}/) && lines[i].trim() !== '' && !lines[i].match(/^\\s*[#]/)))) {
        i++;
      }
      continue;
    }

    // Ordered lists
    if (line.match(/^(\\s*)\\d+\\.\\s+/)) {
      html += parseList(lines, i, 'ol');
      while (i < lines.length && (lines[i].match(/^(\\s*)\\d+\\.\\s+/) || (lines[i].match(/^\\s{2,}/) && lines[i].trim() !== '' && !lines[i].match(/^\\s*[#]/)))) {
        i++;
      }
      continue;
    }

    // Tables
    if (line.trim().match(/^\\|.+\\|\\s*$/)) {
      let tableHtml = '<table>';
      let isHeader = true;
      while (i < lines.length && lines[i].trim().match(/^\\|.+\\|\\s*$/)) {
        const row = lines[i].trim();
        // Skip separator rows
        if (row.match(/^\\|[\\s\\-:|]+\\|\\s*$/)) {
          i++;
          isHeader = false;
          continue;
        }
        const cells = row.slice(1, -1).split('|');
        const tag = isHeader ? 'th' : 'td';
        tableHtml += '<tr>' + cells.map(c => '<' + tag + '>' + inline(c.trim()) + '</' + tag + '>').join('') + '</tr>';
        isHeader = false;
        i++;
      }
      tableHtml += '</table>';
      html += tableHtml;
      continue;
    }

    // Blockquotes
    if (line.match(/^>\\s?(.*)/)) {
      let bq = '';
      while (i < lines.length && lines[i].match(/^>\\s?(.*)/)) {
        bq += lines[i].replace(/^>\\s?/, '') + '\\n';
        i++;
      }
      html += '<blockquote>' + inline(bq.trim()) + '</blockquote>';
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    let para = '';
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^#{1,6}\\s/) && !lines[i].match(/^>/) && !lines[i].match(/^\\|/) && !lines[i].match(/^[-*]\\s+/) && !lines[i].match(/^\\d+\\.\\s/) && !lines[i].trim().startsWith('\`\`\`')) {
      para += (para ? ' ' : '') + lines[i].trim();
      i++;
    }
    html += '<p>' + inline(para) + '</p>';
  }

  // Helper: parse nested list
  function parseList(allLines, startIdx, type) {
    let result = '<' + type + '>';
    let idx = startIdx;
    const baseIndent = (allLines[idx].match(/^(\\s*)/)||['',''])[1].length;

    while (idx < allLines.length) {
      const cur = allLines[idx];
      const indentMatch = cur.match(/^(\\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;
      const isBullet = cur.match(/^\\s*[-*]\\s+/) || cur.match(/^\\s*\\d+\\.\\s+/);

      if (!isBullet && (!cur.match(/^\\s+/) || cur.trim() === '')) break;
      if (isBullet && indent < baseIndent) break;

      if (isBullet && indent === baseIndent) {
        const content = cur.replace(/^\\s*[-*]\\s+/, '').replace(/^\\s*\\d+\\.\\s+/, '');
        result += '<li>' + inline(content);
        idx++;
        // Check for nested list
        if (idx < allLines.length) {
          const nextIndent = (allLines[idx].match(/^(\\s*)/)||['',''])[1].length;
          const nextIsBullet = allLines[idx].match(/^\\s*[-*]\\s+/) || allLines[idx].match(/^\\s*\\d+\\.\\s+/);
          if (nextIsBullet && nextIndent > baseIndent) {
            const nestedType = allLines[idx].match(/^\\s*\\d+\\.\\s+/) ? 'ol' : 'ul';
            const nested = parseList(allLines, idx, nestedType);
            result += nested;
            // Advance past nested items
            while (idx < allLines.length) {
              const ni = (allLines[idx].match(/^(\\s*)/)||['',''])[1].length;
              const nib = allLines[idx].match(/^\\s*[-*]\\s+/) || allLines[idx].match(/^\\s*\\d+\\.\\s+/);
              if (!nib || ni <= baseIndent) break;
              idx++;
            }
          }
        }
        result += '</li>';
      } else if (indent > baseIndent && !isBullet) {
        // Continuation line
        idx++;
      } else {
        break;
      }
    }
    result += '</' + type + '>';
    return result;
  }

  return html;
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showCreateDialog() { document.getElementById('create-dialog').style.display = 'flex'; switchCreateTab('scaffold'); }
function hideCreateDialog() { document.getElementById('create-dialog').style.display = 'none'; document.getElementById('create-result').innerHTML = ''; resetModalUpload(); }

function switchCreateTab(tab) {
  var scaffoldTab = document.getElementById('create-tab-scaffold');
  var uploadTab = document.getElementById('create-tab-upload');
  var tabScaffoldBtn = document.getElementById('tab-scaffold');
  var tabUploadBtn = document.getElementById('tab-upload');
  if (tab === 'scaffold') {
    scaffoldTab.style.display = 'block';
    uploadTab.style.display = 'none';
    tabScaffoldBtn.style.borderBottomColor = '#58a6ff';
    tabScaffoldBtn.style.color = '#58a6ff';
    tabUploadBtn.style.borderBottomColor = 'transparent';
    tabUploadBtn.style.color = '#8b949e';
  } else {
    scaffoldTab.style.display = 'none';
    uploadTab.style.display = 'block';
    tabScaffoldBtn.style.borderBottomColor = 'transparent';
    tabScaffoldBtn.style.color = '#8b949e';
    tabUploadBtn.style.borderBottomColor = '#58a6ff';
    tabUploadBtn.style.color = '#58a6ff';
  }
}

function resetModalUpload() {
  document.getElementById('modal-upload-zone').style.display = 'block';
  document.getElementById('modal-upload-progress').style.display = 'none';
  document.getElementById('modal-upload-error').style.display = 'none';
  document.getElementById('modal-upload-success').style.display = 'none';
}

function handleModalDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  var zone = document.getElementById('modal-upload-zone');
  zone.style.borderColor = '#30363d';
  zone.style.background = '#0d1117';
  var files = e.dataTransfer.files;
  if (files.length > 1) { showModalUploadError('Only one file at a time.'); return; }
  if (files.length === 1) processModalFile(files[0]);
}

function handleModalFileSelect(input) {
  if (input.files && input.files.length > 0) {
    processModalFile(input.files[0]);
    input.value = '';
  }
}

function showModalUploadError(msg) {
  var el = document.getElementById('modal-upload-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function processModalFile(file) {
  // Client-side validation
  var exts = ['.pdf', '.txt', '.text', '.md', '.markdown'];
  var name = file.name.toLowerCase();
  var dotIdx = name.lastIndexOf('.');
  var ext = dotIdx >= 0 ? name.slice(dotIdx) : '';
  if (!exts.includes(ext)) { showModalUploadError('Unsupported format. Use: .pdf, .txt, .text, .md, .markdown'); return; }
  if (file.size === 0) { showModalUploadError('File is empty.'); return; }
  if (file.size > 20 * 1024 * 1024) { showModalUploadError('File exceeds 20 MB limit.'); return; }

  // Show progress
  document.getElementById('modal-upload-zone').style.display = 'none';
  document.getElementById('modal-upload-error').style.display = 'none';
  document.getElementById('modal-upload-progress').style.display = 'block';
  document.getElementById('modal-upload-status').textContent = 'Uploading…';

  var formData = new FormData();
  formData.append('file', file);

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');
  xhr.upload.addEventListener('progress', function(ev) {
    if (ev.lengthComputable) {
      var pct = Math.round((ev.loaded / ev.total) * 100);
      document.getElementById('modal-upload-status').textContent = pct < 100 ? 'Uploading… ' + pct + '%' : 'Processing…';
    }
  });
  xhr.addEventListener('load', function() {
    document.getElementById('modal-upload-progress').style.display = 'none';
    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      // Auto-save with suggested path/filename
      fetch('/api/upload/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId, targetPath: data.suggestedPath, filename: data.suggestedFilename })
      }).then(function(r) { return r.json(); }).then(function(saveResult) {
        if (saveResult.success) {
          document.getElementById('modal-upload-success').style.display = 'block';
          document.getElementById('modal-upload-path').textContent = 'Saved to: ' + saveResult.savedPath;
          showToast('Imported: ' + saveResult.savedPath, 'success');
          init(); // Refresh the tree
        } else {
          // If auto-save fails, redirect to full upload page for manual adjustment
          window.location.href = '/upload';
        }
      }).catch(function() {
        window.location.href = '/upload';
      });
    } else {
      var errMsg = 'Upload failed.';
      try { var errData = JSON.parse(xhr.responseText); if (errData.error) errMsg = errData.error; } catch(e) {}
      document.getElementById('modal-upload-zone').style.display = 'block';
      showModalUploadError(errMsg);
    }
  });
  xhr.addEventListener('error', function() {
    document.getElementById('modal-upload-progress').style.display = 'none';
    document.getElementById('modal-upload-zone').style.display = 'block';
    showModalUploadError('Network error. Please try again.');
  });
  xhr.send(formData);
}

async function createDocument() {
  const pillar = document.getElementById('c-pillar').value;
  const subdomain = document.getElementById('c-subdomain').value;
  const area = document.getElementById('c-area').value;
  const type = document.getElementById('c-type').value;
  const owner = document.getElementById('c-owner').value;
  const el = document.getElementById('create-result');

  if (!area) { el.innerHTML = '<div style="color:#f85149;font-size:13px">Enter an experience area name</div>'; return; }

  const res = await fetch('/api/scaffold', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subdomain, area, type, owner: owner || undefined }),
  });
  const data = await res.json();

  if (data.success) {
    showToast('Created: ' + data.path, 'success');
    hideCreateDialog();
    await init();
    openDoc(data.path);
  } else {
    el.innerHTML = '<div style="color:#f85149;font-size:13px">' + data.error + '</div>';
  }
}

async function validateAll() {
  const res = await fetch('/api/validate');
  const report = await res.json();
  if (report.valid) {
    showToast('All ' + report.summary.documentsChecked + ' documents valid', 'success');
  } else {
    showToast(report.summary.documentsFailed + ' documents failed (' + report.errors.length + ' errors)', 'error');
  }
}

async function regenerateManifest() {
  const res = await fetch('/api/manifest/generate', { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    showToast('Manifest: ' + data.documentCount + ' docs, ' + data.relationshipCount + ' relationships', 'success');
    init();
  }
}

function showToast(msg, type) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function loadActivity() {
  const res = await fetch('/api/activity');
  const items = await res.json();
  const el = document.getElementById('activity-list');
  if (!items.length) { el.innerHTML = '<p style="color:#8b949e">No activity yet</p>'; return; }

  const typeIcons = { overview: '📋', principles: '💡', patterns: '🧩', research: '🔬', decisions: '⚖️', guidelines: '📐', examples: '💎' };

  el.innerHTML = items.map(d => {
    const icon = typeIcons[d.documentType] || '📄';
    const pillar = d.path.startsWith('pillars/') ? d.path.split('/')[1] : (d.path.startsWith('shared') ? 'shared' : 'org');
    const pillarColors = { sports: '#58a6ff', gaming: '#a371f7', 'player-experience': '#d29922', shared: '#3fb950', org: '#8b949e' };
    const pColor = pillarColors[pillar] || '#8b949e';

    // Format time from modifiedAt
    const date = new Date(d.modifiedAt || d.lastUpdated);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    let timeAgo = '';
    if (diffMins < 1) timeAgo = 'just now';
    else if (diffMins < 60) timeAgo = diffMins + 'm ago';
    else if (diffHours < 24) timeAgo = diffHours + 'h ago';
    else if (diffDays < 7) timeAgo = diffDays + 'd ago';
    else timeAgo = date.toLocaleDateString();

    const fullTime = date.toLocaleString();

    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #21262d;cursor:pointer" onclick="openDoc(\\'' + d.path + '\\')">' +
      '<span style="font-size:11px;color:#484f58;min-width:70px" title="' + fullTime + '">' + timeAgo + '</span>' +
      '<span>' + icon + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;color:#c9d1d9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + d.title + '</div>' +
        '<div style="font-size:11px;color:#484f58;display:flex;gap:6px;margin-top:2px">' +
          '<span style="color:' + pColor + '">' + pillar + '</span>' +
          '<span>·</span>' +
          '<span>' + (d.experienceArea || '') + '</span>' +
          '<span>·</span>' +
          '<span>' + (d.documentType || '') + '</span>' +
        '</div>' +
      '</div>' +
      '<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:#21262d;color:#8b949e">' + (d.status || 'draft') + '</span>' +
    '</div>';
  }).join('');
}

async function loadExperienceMap() {
  const res = await fetch('/api/experience-map');
  const map = await res.json();
  const el = document.getElementById('experience-map');

  let html = '';

  // Pillars
  map.pillars.forEach(pillar => {
    html += '<div style="margin-bottom:24px">';
    html += '<h3 style="font-size:16px;color:#fff;margin-bottom:12px">' + pillar.icon + ' ' + pillar.name + '</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';

    pillar.subdomains.forEach(sub => {
      const documented = sub.areas.filter(a => a.documented).length;
      const total = sub.areas.length;
      const pct = Math.round((documented / total) * 100);

      html += '<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
      html += '<span style="font-weight:600;font-size:14px">' + sub.name + '</span>';
      html += '<span style="font-size:11px;color:#8b949e">' + documented + '/' + total + ' (' + pct + '%)</span>';
      html += '</div>';
      html += '<div style="height:4px;background:#21262d;border-radius:2px;margin-bottom:10px"><div style="height:100%;background:' + (pct > 0 ? '#238636' : '#21262d') + ';border-radius:2px;width:' + pct + '%"></div></div>';

      sub.areas.forEach(area => {
        const color = area.documented ? '#3fb950' : '#484f58';
        const icon = area.documented ? '●' : '○';
        const typeIcons = { overview: '📋', principles: '💡', patterns: '🧩', research: '🔬', decisions: '⚖️', guidelines: '📐', examples: '💎' };
        const typeDots = (area.documentTypes || []).map(t => '<span title="' + t + '" style="font-size:10px;margin-left:2px">' + (typeIcons[t] || '') + '</span>').join('');

        html += '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;cursor:' + (area.documented ? 'pointer' : 'default') + '" ' +
          (area.path ? 'onclick="openDoc(\\'' + area.path + '\\')"' : '') + '>';
        html += '<span style="color:' + color + ';font-size:10px">' + icon + '</span>';
        html += '<span style="color:' + (area.documented ? '#c9d1d9' : '#484f58') + ';flex:1">' + area.name + '</span>';
        html += typeDots;
        html += '</div>';
      });

      html += '</div>';
    });

    html += '</div></div>';
  });

  // Shared
  html += '<div style="margin-bottom:24px">';
  html += '<h3 style="font-size:16px;color:#fff;margin-bottom:12px">🔗 Shared (Cross-Pillar)</h3>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
  map.shared.forEach(area => {
    const color = area.documented ? '#3fb950' : '#484f58';
    const bg = area.documented ? '#0d2818' : '#161b22';
    const border = area.documented ? '#238636' : '#30363d';
    html += '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:6px;padding:8px 14px;font-size:13px;color:' + color + '">' + area.name + '</div>';
  });
  html += '</div></div>';

  el.innerHTML = html;
}

function showHomepage() {
  document.getElementById('homepage').style.display = 'block';
  document.getElementById('doc-view').style.display = 'none';
  document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
  currentDoc = null;
  navHistory = [];
  history.pushState(null, '', '/');
}

function goBack() {
  if (navHistory.length > 0) {
    var prev = navHistory.pop();
    if (prev.type === 'lobby') {
      openLobby(prev.pillarSlug, prev.subdomainSlug, prev.areaSlug, true);
    } else if (prev.type === 'doc') {
      openDoc(prev.path, true);
    } else {
      showHomepage();
    }
  } else {
    showHomepage();
  }
}

function buildBreadcrumbs(filePath) {
  // filePath like: pillars/sports/transactional/bet-builder/bet-builder-plus-experience.md
  var parts = filePath.replace(/^pillars\\//, '').replace(/\\.md$/, '').split('/');
  var crumbs = '<span style="font-size:12px;color:#8b949e;display:flex;align-items:center;gap:4px;flex-wrap:wrap">';
  crumbs += '<a href="#" onclick="event.preventDefault();showHomepage()" style="color:#58a6ff;text-decoration:none">Home</a>';
  
  var accumulated = '';
  for (var i = 0; i < parts.length; i++) {
    crumbs += ' <span style="color:#484f58">/</span> ';
    accumulated += (accumulated ? '/' : '') + parts[i];
    var label = parts[i].replace(/-/g, ' ').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
    
    if (i < parts.length - 1) {
      // Clickable — navigate to lobby or parent
      var lobbyParts = accumulated.split('/');
      if (lobbyParts.length >= 2) {
        crumbs += '<a href="#" onclick="event.preventDefault();openLobby(\\'' + lobbyParts[0] + '\\',\\'' + lobbyParts[1] + '\\',\\'' + (lobbyParts[2] || '') + '\\')" style="color:#58a6ff;text-decoration:none">' + label + '</a>';
      } else {
        crumbs += '<span style="color:#c9d1d9">' + label + '</span>';
      }
    } else {
      // Current page — not clickable
      crumbs += '<span style="color:#c9d1d9;font-weight:500">' + label + '</span>';
    }
  }
  crumbs += '</span>';
  return crumbs;
}

function openDeepLink(path) {
  // Try to match path to a document
  // URL format: /sports/discovery/market-layouts/overview → pillars/sports/discovery/market-layouts/overview.md
  // Or: /sports/discovery → lobby for that subdomain

  // First try exact match with .md extension
  var candidates = [
    'pillars/' + path + '.md',
    'pillars/' + path + '/index.md',
    'pillars/' + path + '/overview.md',
    path + '.md',
    path + '/index.md',
  ];

  var found = null;
  for (var c = 0; c < candidates.length; c++) {
    var match = docs.find(function(d) { return d.path === candidates[c]; });
    if (match) { found = match; break; }
  }

  if (found) {
    openDoc(found.path);
    return;
  }

  // Try as a lobby — check if path matches pillar/subdomain or pillar/subdomain/area
  var parts = path.split('/');
  if (parts.length >= 2) {
    var pillarSlug = parts[0];
    var subSlug = parts[1];
    var areaSlug = parts.length >= 3 ? parts[2] : null;
    openLobby(pillarSlug, subSlug, areaSlug);
    return;
  }

  // Fallback: try to find any doc whose path contains the deep link
  var fuzzy = docs.find(function(d) { return d.path.includes(path); });
  if (fuzzy) {
    openDoc(fuzzy.path);
  }
}

init();
</script>
</body>
</html>`;

// ─── Startup Cleanup ─────────────────────────────────────────────────────────

// Clear stale files in tmp/uploads/ on server start (except .gitkeep)
const uploadsDir = path.resolve(ROOT_DIR, 'tmp/uploads');
try {
  if (fs.existsSync(uploadsDir)) {
    const staleFiles = fs.readdirSync(uploadsDir);
    for (const file of staleFiles) {
      if (file === '.gitkeep') continue;
      try {
        fs.unlinkSync(path.join(uploadsDir, file));
      } catch {
        // Ignore errors for individual files
      }
    }
  }
} catch {
  // If directory doesn't exist or can't be read, just skip cleanup
}

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('');
  console.log('  Experience Design Guidelines Dashboard');
  console.log('  ─────────────────────────────────────────');
  console.log('  Running at: http://localhost:' + PORT);
  console.log('');
  console.log('  Features:');
  console.log('    • Browse documents in sidebar tree');
  console.log('    • Preview rendered markdown');
  console.log('    • Edit documents with live preview');
  console.log('    • Create new documents via dialog');
  console.log('    • Validate and rebuild manifest');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
