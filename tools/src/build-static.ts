/**
 * Sports Experience Guidelines — Static Site Builder
 *
 * Walks the markdown tree, generates the manifest, and emits a fully
 * static site to dist/ that can be deployed to Netlify (or any static
 * host). No backend, no functions — just HTML, CSS, and a JSON index.
 *
 * Usage: npm run build
 *
 * Output:
 *   dist/index.html              — homepage with pillar overview + index
 *   dist/<doc-path>.html         — one HTML page per markdown file
 *   dist/manifest.json           — searchable client-side index
 *   dist/assets/styles.css       — shared stylesheet
 */

import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, resolve, extname } from 'node:path';
import { generateManifest } from './manifest-generator.js';
import type { Manifest, ManifestEntry } from './types.js';

const ROOT_DIR = resolve(process.cwd());
const DIST_DIR = join(ROOT_DIR, 'dist');

// ─── HTML escaping ───────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Markdown renderer ───────────────────────────────────────────────────────
// Lightweight: headings, paragraphs, lists, tables, code blocks, links,
// inline emphasis. Matches the look of the dashboard's preview pane.

interface RenderContext {
  /** Path of the current document (relative to repo root) — used to resolve relative links. */
  sourcePath: string;
}

function inlineMd(text: string, ctx: RenderContext): string {
  let s = escapeHtml(text);
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // Links — resolve relative .md to .html
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const resolved = resolveLink(href, ctx);
    return `<a href="${escapeHtml(resolved)}">${label}</a>`;
  });
  return s;
}

function resolveLink(href: string, ctx: RenderContext): string {
  // External or anchor links pass through
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  // Resolve relative to the source document's directory
  const sourceDir = dirname(ctx.sourcePath);
  const resolved = join(sourceDir, href).replace(/\\/g, '/');
  // Map .md to .html for internal navigation
  if (resolved.endsWith('.md')) return '/' + resolved.replace(/\.md$/, '.html');
  // Map directory references like "discovery/" to a likely index
  if (resolved.endsWith('/')) return '/' + resolved + 'index.html';
  return '/' + resolved;
}

function renderMarkdown(md: string, ctx: RenderContext): string {
  // Strip frontmatter if present (it's rendered separately by the page shell)
  let body = md;
  if (md.startsWith('---')) {
    const end = md.indexOf('---', 3);
    if (end !== -1) body = md.slice(end + 3).trim();
  }

  const lines = body.split('\n');
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeBuffer: string[] = [];
  let codeLang = '';

  function flushParagraph(buf: string[]) {
    if (buf.length === 0) return;
    out.push('<p>' + inlineMd(buf.join(' '), ctx) + '</p>');
  }

  let paragraph: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    // Code block fence
    if (line.startsWith('```')) {
      if (inCode) {
        out.push(
          `<pre><code${codeLang ? ` class="lang-${escapeHtml(codeLang)}"` : ''}>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`,
        );
        codeBuffer = [];
        codeLang = '';
        inCode = false;
      } else {
        flushParagraph(paragraph);
        paragraph = [];
        codeLang = line.slice(3).trim();
        inCode = true;
      }
      i++;
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      i++;
      continue;
    }

    // HTML comments (e.g. <!-- ai:summary -->) pass through unchanged for now
    if (line.trim().startsWith('<!--')) {
      flushParagraph(paragraph);
      paragraph = [];
      i++;
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph);
      paragraph = [];
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMd(heading[2], ctx)}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushParagraph(paragraph);
      paragraph = [];
      out.push('<hr>');
      i++;
      continue;
    }

    // Tables (simple: pipe-separated, requires a header separator row)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[-: |]+\|?\s*$/.test(lines[i + 1])) {
      flushParagraph(paragraph);
      paragraph = [];
      const headerCells = splitTableRow(line);
      const rows: string[][] = [];
      i += 2; // skip header + separator
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      out.push(renderTable(headerCells, rows, ctx));
      continue;
    }

    // Bulleted list
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph(paragraph);
      paragraph = [];
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push('<ul>' + items.map((it) => `<li>${inlineMd(it, ctx)}</li>`).join('') + '</ul>');
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph(paragraph);
      paragraph = [];
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push('<ol>' + items.map((it) => `<li>${inlineMd(it, ctx)}</li>`).join('') + '</ol>');
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      flushParagraph(paragraph);
      paragraph = [];
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push('<blockquote>' + inlineMd(quote.join(' '), ctx) + '</blockquote>');
      continue;
    }

    // Blank line ends paragraph
    if (line.trim() === '') {
      flushParagraph(paragraph);
      paragraph = [];
      i++;
      continue;
    }

    // Default: paragraph line
    paragraph.push(line);
    i++;
  }

  flushParagraph(paragraph);
  return out.join('\n');
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

function renderTable(header: string[], rows: string[][], ctx: RenderContext): string {
  const headHtml = header.map((c) => `<th>${inlineMd(c, ctx)}</th>`).join('');
  const bodyHtml = rows
    .map((r) => '<tr>' + r.map((c) => `<td>${inlineMd(c, ctx)}</td>`).join('') + '</tr>')
    .join('');
  return `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

// ─── Page shell ──────────────────────────────────────────────────────────────

function pageShell(opts: {
  title: string;
  description?: string;
  bodyHtml: string;
  active?: string; // active pillar slug
  breadcrumbs?: Array<{ label: string; href: string }>;
}): string {
  const desc = opts.description ?? 'Sports Experience Guidelines — knowledge architecture for design at scale.';
  const breadcrumbHtml = opts.breadcrumbs
    ? `<nav class="crumbs">${opts.breadcrumbs
        .map((c, idx, arr) =>
          idx === arr.length - 1
            ? `<span>${escapeHtml(c.label)}</span>`
            : `<a href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a><span class="sep">/</span>`,
        )
        .join('')}</nav>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.title)} — Experience Guidelines</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
<header class="site-header">
  <div class="site-header__inner">
    <a class="site-title" href="/">
      <span class="mono">Sports UX Atlas</span>
      <span class="dot">·</span>
      <span class="quiet">Experience Guidelines</span>
    </a>
    <nav class="site-nav">
      <a href="/pillars/sports/index.html">Sports</a>
      <a href="/pillars/gaming/index.html">Gaming</a>
      <a href="/pillars/player-experience/index.html">Player Experience</a>
    </nav>
  </div>
</header>
<main class="page">
  ${breadcrumbHtml}
  ${opts.bodyHtml}
</main>
<footer class="site-footer">
  <div class="site-footer__inner mono">
    <span>Sports UX · Design Ops · MMXXVI</span>
    <span>An offering to those who design, and the agents that learn from them</span>
  </div>
</footer>
</body>
</html>`;
}

// ─── Frontmatter card ────────────────────────────────────────────────────────

function renderFrontmatterCard(entry: ManifestEntry): string {
  return `<section class="meta-card">
  <div class="meta-card__type mono">${escapeHtml(entry.documentType)}</div>
  <h1 class="meta-card__title">${escapeHtml(entry.title)}</h1>
  ${entry.summary ? `<p class="meta-card__summary">${escapeHtml(entry.summary)}</p>` : ''}
  <dl class="meta-card__grid">
    <div><dt>Subdomain</dt><dd>${escapeHtml(entry.subdomain)}</dd></div>
    <div><dt>Area</dt><dd>${escapeHtml(entry.experienceArea || '—')}</dd></div>
    <div><dt>Owner</dt><dd>${escapeHtml(entry.owner || 'Unassigned')}</dd></div>
    <div><dt>Updated</dt><dd>${escapeHtml(entry.lastUpdated || '—')}</dd></div>
    <div><dt>Status</dt><dd class="status status--${escapeHtml(entry.status)}">${escapeHtml(entry.status)}</dd></div>
  </dl>
  ${entry.tags?.length ? `<ul class="meta-card__tags">${entry.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
</section>`;
}

// ─── Document page ───────────────────────────────────────────────────────────

async function renderDocumentPage(entry: ManifestEntry, manifest: Manifest): Promise<string> {
  const fullPath = join(ROOT_DIR, entry.path);
  const md = await readFile(fullPath, 'utf-8');
  const body = renderMarkdown(md, { sourcePath: entry.path });

  const breadcrumbs = pathToBreadcrumbs(entry.path);
  const related = manifest.relationships
    .filter((r) => r.source === entry.path || r.target === entry.path)
    .map((r) => {
      const otherPath = r.source === entry.path ? r.target : r.source;
      const other = manifest.documents.find((d) => d.path === otherPath);
      return other ? { entry: other, type: r.type } : null;
    })
    .filter(Boolean) as Array<{ entry: ManifestEntry; type: string }>;

  const relatedHtml = related.length
    ? `<section class="related">
        <h2>Related</h2>
        <ul class="related__list">
          ${related
            .map(
              (r) =>
                `<li><a href="/${r.entry.path.replace(/\.md$/, '.html')}"><span class="mono small">${escapeHtml(r.type)}</span> ${escapeHtml(r.entry.title)}</a></li>`,
            )
            .join('')}
        </ul>
      </section>`
    : '';

  return pageShell({
    title: entry.title,
    description: entry.summary,
    breadcrumbs,
    bodyHtml: `${renderFrontmatterCard(entry)}<article class="prose">${body}</article>${relatedHtml}`,
  });
}

function pathToBreadcrumbs(docPath: string): Array<{ label: string; href: string }> {
  const parts = docPath.split('/');
  const crumbs: Array<{ label: string; href: string }> = [{ label: 'Home', href: '/' }];
  let cumulative = '';
  for (let i = 0; i < parts.length; i++) {
    cumulative += (i === 0 ? '' : '/') + parts[i];
    const isLast = i === parts.length - 1;
    const label = parts[i].replace(/\.md$/, '').replace(/-/g, ' ');
    const href = isLast ? '#' : `/${cumulative}/index.html`;
    crumbs.push({ label, href });
  }
  return crumbs;
}

// ─── Homepage ────────────────────────────────────────────────────────────────

function renderHomepage(manifest: Manifest): string {
  const docsByPillar = groupByPillar(manifest.documents);
  const recent = [...manifest.documents]
    .sort((a, b) => (b.lastUpdated || '').localeCompare(a.lastUpdated || ''))
    .slice(0, 8);

  const pillarCards = ['sports', 'gaming', 'player-experience']
    .map((slug) => {
      const docs = docsByPillar[slug] ?? [];
      const documented = docs.filter((d) => d.status === 'published').length;
      const label = slug === 'player-experience' ? 'Player Experience' : slug.charAt(0).toUpperCase() + slug.slice(1);
      return `<a class="pillar-card" href="/pillars/${slug}/index.html">
        <div class="pillar-card__index mono">Pillar</div>
        <div class="pillar-card__title">${escapeHtml(label)}</div>
        <div class="pillar-card__stats mono small">
          <span>${docs.length} documents</span>
          <span class="dot">·</span>
          <span>${documented} published</span>
        </div>
      </a>`;
    })
    .join('');

  const recentList = recent
    .map(
      (d) => `<li class="recent__row">
        <a href="/${d.path.replace(/\.md$/, '.html')}">
          <span class="recent__title">${escapeHtml(d.title)}</span>
          <span class="recent__meta mono small">${escapeHtml(d.subdomain)} · ${escapeHtml(d.lastUpdated || '—')}</span>
        </a>
      </li>`,
    )
    .join('');

  const indexList = manifest.documents
    .map(
      (d) => `<li class="index-row" data-search="${escapeHtml((d.title + ' ' + d.summary + ' ' + d.tags.join(' ')).toLowerCase())}">
        <a href="/${d.path.replace(/\.md$/, '.html')}">
          <span class="index-row__title">${escapeHtml(d.title)}</span>
          <span class="index-row__path mono small">${escapeHtml(d.path)}</span>
          <span class="index-row__status status status--${escapeHtml(d.status)}">${escapeHtml(d.status)}</span>
        </a>
      </li>`,
    )
    .join('');

  const body = `
    <section class="hero">
      <p class="eyebrow mono">Cosmography of the Sports Experience System</p>
      <h1 class="hero__title">The Experience <em>Universe</em>.</h1>
      <p class="hero__lede">Designing experiences at scale — for humans, and for the agents that work alongside them. ${manifest.documentCount} documents across ${Object.keys(docsByPillar).length} pillars.</p>
    </section>

    <section class="pillars">${pillarCards}</section>

    <section class="recent">
      <h2 class="section-title">Recently updated</h2>
      <ul class="recent__list">${recentList}</ul>
    </section>

    <section class="index">
      <div class="index__head">
        <h2 class="section-title">Full index</h2>
        <input type="search" class="index__search" placeholder="Filter ${manifest.documentCount} documents…" oninput="window.__filterIndex(this.value)">
      </div>
      <ul class="index__list" id="index-list">${indexList}</ul>
    </section>

    <script>
    window.__filterIndex = function(q) {
      var rows = document.querySelectorAll('#index-list .index-row');
      var qq = q.trim().toLowerCase();
      rows.forEach(function(row) {
        var hay = row.getAttribute('data-search') || '';
        row.style.display = (qq === '' || hay.indexOf(qq) !== -1) ? '' : 'none';
      });
    };
    </script>
  `;

  return pageShell({
    title: 'The Experience Universe',
    description: `Sports Experience Guidelines — ${manifest.documentCount} documents across ${Object.keys(docsByPillar).length} pillars.`,
    bodyHtml: body,
  });
}

function groupByPillar(docs: ManifestEntry[]): Record<string, ManifestEntry[]> {
  const groups: Record<string, ManifestEntry[]> = {};
  for (const d of docs) {
    const m = d.path.match(/^pillars\/([^/]+)\//);
    const key = m ? m[1] : 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  }
  return groups;
}

// ─── 404 page ────────────────────────────────────────────────────────────────

function render404(): string {
  return pageShell({
    title: 'Not found',
    bodyHtml: `<section class="hero">
      <p class="eyebrow mono">404</p>
      <h1 class="hero__title">This corner of the universe is empty.</h1>
      <p class="hero__lede">The document you're looking for has moved, or hasn't been written yet. <a href="/">Return to the index</a>.</p>
    </section>`,
  });
}

// ─── Stylesheet ──────────────────────────────────────────────────────────────

const STYLESHEET = `:root {
  --ink: oklch(0.155 0.018 260);
  --ink-2: oklch(0.20 0.020 260);
  --bone: oklch(0.94 0.014 75);
  --bone-soft: oklch(0.86 0.018 75);
  --quiet: oklch(0.74 0.020 75);
  --gold: oklch(0.86 0.10 78);
  --rule: oklch(0.94 0.014 75 / 0.14);
  --rule-strong: oklch(0.94 0.014 75 / 0.24);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--ink);
  color: var(--bone);
  font-family: 'Inter Tight', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.04em; }
.small { font-size: 11px; }
.quiet { color: var(--quiet); }
.dot { opacity: 0.5; margin: 0 0.4em; }
a { color: var(--bone); text-decoration: none; }
a:hover { color: var(--gold); }

/* Header */
.site-header {
  border-bottom: 1px solid var(--rule);
  padding: 18px 32px;
  background: var(--ink);
  position: sticky;
  top: 0;
  backdrop-filter: blur(8px);
  z-index: 10;
}
.site-header__inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1280px;
  margin: 0 auto;
}
.site-title { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--bone); }
.site-title .quiet { color: var(--quiet); text-transform: none; letter-spacing: 0; font-family: 'Fraunces', serif; font-style: italic; font-size: 14px; }
.site-nav { display: flex; gap: 28px; font-size: 13px; }
.site-nav a { color: var(--bone-soft); }

/* Page */
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 56px 32px 96px;
  flex: 1;
  width: 100%;
}

/* Crumbs */
.crumbs { font-size: 12px; color: var(--quiet); margin-bottom: 32px; font-family: 'JetBrains Mono', monospace; }
.crumbs a { color: var(--quiet); }
.crumbs a:hover { color: var(--bone); }
.crumbs .sep { margin: 0 8px; opacity: 0.5; }

/* Hero (homepage) */
.hero { margin-bottom: 64px; }
.eyebrow { font-size: 11px; letter-spacing: 0.30em; text-transform: uppercase; color: var(--gold); margin: 0 0 18px; }
.hero__title {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 300;
  font-size: clamp(48px, 7vw, 96px);
  line-height: 0.96;
  letter-spacing: -0.025em;
  margin: 0 0 24px;
  max-width: 18ch;
}
.hero__title em { font-style: italic; color: var(--gold); }
.hero__lede {
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(18px, 2vw, 22px);
  color: var(--bone-soft);
  max-width: 60ch;
  margin: 0;
}

.section-title {
  font-family: 'Fraunces', serif;
  font-weight: 300;
  font-size: 22px;
  color: var(--bone);
  margin: 0 0 24px;
  letter-spacing: -0.01em;
}

/* Pillar cards */
.pillars {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 64px;
}
@media (max-width: 720px) { .pillars { grid-template-columns: 1fr; } }
.pillar-card {
  display: block;
  border: 1px solid var(--rule-strong);
  border-radius: 4px;
  padding: 28px;
  transition: border-color 0.15s, transform 0.15s;
}
.pillar-card:hover { border-color: var(--gold); transform: translateY(-1px); }
.pillar-card__index { font-size: 10px; letter-spacing: 0.30em; text-transform: uppercase; color: var(--gold); margin-bottom: 16px; }
.pillar-card__title {
  font-family: 'Fraunces', serif;
  font-weight: 300;
  font-size: 28px;
  color: var(--bone);
  margin-bottom: 14px;
  letter-spacing: -0.01em;
}
.pillar-card__stats { color: var(--quiet); font-size: 11px; }

/* Recent + index */
.recent { margin-bottom: 64px; }
.recent__list, .index__list { list-style: none; margin: 0; padding: 0; }
.recent__row, .index-row { border-top: 1px solid var(--rule); }
.recent__row:last-child, .index-row:last-child { border-bottom: 1px solid var(--rule); }
.recent__row a, .index-row a {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 14px 0;
  gap: 24px;
}
.recent__title, .index-row__title { color: var(--bone); }
.recent__meta, .index-row__path { color: var(--quiet); }
.recent__row a:hover .recent__title,
.index-row a:hover .index-row__title { color: var(--gold); }

/* Index */
.index__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}
.index__search {
  flex: 0 0 320px;
  background: transparent;
  color: var(--bone);
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.index__search:focus { outline: none; border-color: var(--gold); }
.index-row__status { flex-shrink: 0; }

/* Status pill */
.status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 2px 8px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  color: var(--quiet);
}
.status--published { color: var(--gold); border-color: oklch(0.86 0.10 78 / 0.5); }
.status--draft { color: var(--quiet); }
.status--in-review { color: oklch(0.78 0.08 220); }
.status--deprecated { color: oklch(0.62 0.10 30); }

/* Document meta card */
.meta-card {
  border: 1px solid var(--rule-strong);
  border-radius: 4px;
  padding: 28px;
  margin-bottom: 40px;
}
.meta-card__type { font-size: 10px; letter-spacing: 0.30em; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }
.meta-card__title {
  font-family: 'Fraunces', serif;
  font-weight: 300;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 18px;
  color: var(--bone);
}
.meta-card__summary {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  font-size: 17px;
  line-height: 1.5;
  color: var(--bone-soft);
  margin: 0 0 24px;
  max-width: 65ch;
}
.meta-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin: 0 0 18px;
  font-size: 12px;
}
.meta-card__grid dt { color: var(--quiet); font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 4px; }
.meta-card__grid dd { color: var(--bone); margin: 0; }
.meta-card__tags { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.meta-card__tags li {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--quiet);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 3px 8px;
}

/* Prose */
.prose { max-width: 70ch; }
.prose h1 { font-family: 'Fraunces', serif; font-weight: 300; font-size: 32px; margin: 48px 0 16px; letter-spacing: -0.015em; color: var(--bone); }
.prose h2 { font-family: 'Fraunces', serif; font-weight: 300; font-size: 24px; margin: 40px 0 14px; letter-spacing: -0.01em; color: var(--bone); border-top: 1px solid var(--rule); padding-top: 24px; }
.prose h3 { font-family: 'Fraunces', serif; font-weight: 400; font-style: italic; font-size: 19px; margin: 28px 0 10px; color: var(--bone); }
.prose h4, .prose h5, .prose h6 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.18em; margin: 24px 0 8px; color: var(--gold); font-family: 'JetBrains Mono', monospace; font-weight: 500; }
.prose p { margin: 0 0 16px; color: var(--bone-soft); line-height: 1.7; }
.prose strong { color: var(--bone); font-weight: 500; }
.prose em { font-style: italic; color: var(--bone); }
.prose ul, .prose ol { margin: 0 0 16px; padding-left: 24px; color: var(--bone-soft); }
.prose li { margin-bottom: 6px; line-height: 1.7; }
.prose a { color: var(--gold); border-bottom: 1px solid oklch(0.86 0.10 78 / 0.3); }
.prose a:hover { border-bottom-color: var(--gold); }
.prose code { font-family: 'JetBrains Mono', monospace; font-size: 13px; background: var(--ink-2); padding: 2px 6px; border-radius: 2px; color: var(--gold); }
.prose pre { background: var(--ink-2); border: 1px solid var(--rule); border-radius: 4px; padding: 16px; overflow-x: auto; margin: 0 0 16px; }
.prose pre code { background: transparent; padding: 0; color: var(--bone); font-size: 12px; }
.prose blockquote { border-left: 2px solid var(--gold); padding-left: 16px; color: var(--bone-soft); font-style: italic; margin: 0 0 16px; }
.prose hr { border: none; border-top: 1px solid var(--rule); margin: 32px 0; }
.prose table { width: 100%; border-collapse: collapse; margin: 0 0 24px; font-size: 13px; }
.prose th { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--rule-strong); color: var(--quiet); font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 500; }
.prose td { padding: 12px; border-bottom: 1px solid var(--rule); vertical-align: top; color: var(--bone-soft); }
.prose td:first-child { color: var(--bone); }

/* Related */
.related { margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--rule); }
.related h2 { font-family: 'Fraunces', serif; font-weight: 300; font-size: 18px; margin: 0 0 16px; color: var(--bone); }
.related__list { list-style: none; margin: 0; padding: 0; }
.related__list li { padding: 10px 0; border-bottom: 1px solid var(--rule); }
.related__list .mono { color: var(--quiet); margin-right: 12px; }
.related__list a { color: var(--bone-soft); }
.related__list a:hover { color: var(--gold); }

/* Footer */
.site-footer {
  border-top: 1px solid var(--rule);
  padding: 24px 32px;
  margin-top: auto;
}
.site-footer__inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--quiet);
}
@media (max-width: 720px) {
  .site-footer__inner { flex-direction: column; gap: 8px; }
  .site-nav { gap: 16px; font-size: 12px; }
  .index__head { flex-direction: column; align-items: stretch; }
  .index__search { flex: 1; }
}

/* Web fonts */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

// ─── Build orchestrator ──────────────────────────────────────────────────────

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function writeFileEnsured(p: string, content: string): Promise<void> {
  await ensureDir(dirname(p));
  await writeFile(p, content, 'utf-8');
}

async function build(): Promise<void> {
  const start = Date.now();
  console.log('Building static site → dist/');

  // Generate manifest
  const manifest = await generateManifest(ROOT_DIR);
  console.log(`  Found ${manifest.documentCount} documents`);

  // Stylesheet
  await writeFileEnsured(join(DIST_DIR, 'assets', 'styles.css'), STYLESHEET);

  // Manifest as JSON for client-side use
  await writeFileEnsured(join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Homepage
  await writeFileEnsured(join(DIST_DIR, 'index.html'), renderHomepage(manifest));

  // 404
  await writeFileEnsured(join(DIST_DIR, '404.html'), render404());

  // Document pages
  let written = 0;
  for (const entry of manifest.documents) {
    if (entry.path === 'index.md') continue; // root index handled by homepage
    const html = await renderDocumentPage(entry, manifest);
    const outPath = join(DIST_DIR, entry.path.replace(/\.md$/, '.html'));
    await writeFileEnsured(outPath, html);
    written++;
  }

  console.log(`  Wrote ${written} document pages`);
  console.log(`  Built in ${Date.now() - start}ms`);
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
