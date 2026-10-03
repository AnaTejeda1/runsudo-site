#!/usr/bin/env node
// Generates the static /backtests section of runsudo.dev from data/backtests/**.
// No dependencies. Run from the repo root: node scripts/build-backtests.mjs
//
// Every route gets a real index.html so GitHub Pages can serve it without routing:
//   backtests/index.html
//   backtests/<repo>/index.html                      (latest run)
//   backtests/<repo>/<run-id>/index.html
//   backtests/<repo>/<run-id>/<ticket>/index.html
//
// Runs are addressed by their harness run id (e.g. run-20260930-144322), which is unique,
// so several runs of one repo can land on the same day. The run's `date` is display only.
//
// All data is treated as untrusted. Markdown is rendered by a small sanitizing renderer
// that never passes raw HTML through; diffs, judge text and every other string are escaped.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'backtests');
const OUT = join(ROOT, 'backtests');
const SITE = 'https://runsudo.dev';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const VERDICTS = ['better', 'par', 'worse', 'error'];
const VERDICT_LABEL = { better: 'Better', par: 'Par', worse: 'Worse', error: 'Error' };

// Anything that is not better/par/worse is displayed as an error (incl. no_patch).
const displayVerdict = (t) => (['better', 'par', 'worse'].includes(t.verdict) ? t.verdict : 'error');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
function fmtShort(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
const dateMs = (iso) => Date.UTC(...iso.split('-').map((n, i) => Number(n) - (i === 1 ? 1 : 0)));

// Harness run ids look like run-YYYYMMDD-HHMMSS. The time part is used only to spread
// same-day runs along the chart's x-axis; the run's `date` field remains the date shown.
const RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function runTimeFraction(id) {
  const m = String(id || '').match(/^run-\d{8}-(\d{2})(\d{2})(\d{2})$/);
  if (!m) return 0.5;
  return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) / 86400;
}
const runMs = (run) => dateMs(run.date) + runTimeFraction(run.id) * 86400000;
// Newest first: by date, then by id (ids sort chronologically within a day).
const byNewest = (a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));

function fmtDuration(s) {
  if (s == null || Number.isNaN(Number(s))) return '—';
  s = Math.round(Number(s));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}
const fmtInt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'));
const pct = (num, den) => (den ? Math.round((num / den) * 100) : 0);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function readJSON(p) { return JSON.parse(readFileSync(p, 'utf8')); }
function writePage(relDir, html) {
  const dir = join(OUT, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

// ---------------------------------------------------------------------------
// Sanitizing markdown renderer. Input is escaped before any transform, so no
// raw HTML from the source can ever reach the page. Links are only kept when
// they are absolute http(s) URLs.
// ---------------------------------------------------------------------------

function renderMarkdown(src) {
  const lines = String(src ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const isBlank = (l) => /^\s*$/.test(l);
  const listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  const tableSepRe = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) { i++; continue; }

    // Fenced code block
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/);
    if (fence) {
      const close = fence[1];
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(close[0].repeat(3))) { buf.push(lines[i]); i++; }
      i++; // closing fence
      const lang = fence[2] ? ` class="lang-${esc(fence[2])}"` : '';
      out.push(`<pre><code${lang}>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // Heading
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) { const n = h[1].length; out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }

    // Horizontal rule
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    // Blockquote
    if (/^\s{0,3}>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) { buf.push(lines[i].replace(/^\s{0,3}>\s?/, '')); i++; }
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    // Table (GFM): header row, separator row, body rows
    if (line.includes('|') && i + 1 < lines.length && tableSepRe.test(lines[i + 1])) {
      const splitRow = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim());
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !isBlank(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      out.push('<div class="tablewrap"><table class="table"><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
        + rows.map((r) => '<tr>' + head.map((_, k) => `<td>${inline(r[k] ?? '')}</td>`).join('') + '</tr>').join('')
        + '</tbody></table></div>');
      continue;
    }

    // List (flat; nested indentation is flattened)
    const lm = line.match(listRe);
    if (lm) {
      const ordered = /\d/.test(lm[2]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(listRe);
        if (m) { items.push(m[3]); i++; continue; }
        // continuation line (indented, non-blank) belongs to the previous item
        if (items.length && !isBlank(lines[i]) && /^\s{2,}/.test(lines[i])) { items[items.length - 1] += ' ' + lines[i].trim(); i++; continue; }
        break;
      }
      const li = items.map((t) => {
        const task = t.match(/^\[( |x|X)\]\s+(.*)$/);
        if (task) return `<li><input type="checkbox" disabled${task[1] !== ' ' ? ' checked' : ''}> ${inline(task[2])}</li>`;
        return `<li>${inline(t)}</li>`;
      }).join('');
      out.push(ordered ? `<ol>${li}</ol>` : `<ul>${li}</ul>`);
      continue;
    }

    // Paragraph: consecutive non-blank lines that don't start another block
    const buf = [];
    while (i < lines.length && !isBlank(lines[i]) && !/^\s*(`{3,}|~{3,})/.test(lines[i]) && !/^\s{0,3}#{1,6}\s/.test(lines[i]) && !/^\s{0,3}>/.test(lines[i]) && !listRe.test(lines[i])) {
      buf.push(lines[i].trim()); i++;
    }
    if (buf.length) out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
    else i++; // safety: never loop forever
  }
  return out.join('\n');
}

function inline(text) {
  let s = esc(text);
  const slots = [];
  const stash = (html) => { slots.push(html); return `\u0000${slots.length - 1}\u0000`; };

  // code spans
  s = s.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (_, _t, code) => stash(`<code>${code.trim()}</code>`));
  // images: show alt text (linked if the src is http(s))
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, alt, url) =>
    /^https?:\/\//i.test(url) ? stash(`<a href="${url}" rel="noopener nofollow" target="_blank">${alt || 'image'}</a>`) : (alt || 'image'));
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, txt, url) =>
    /^https?:\/\//i.test(url) ? stash(`<a href="${url}" rel="noopener nofollow" target="_blank">${txt}</a>`) : txt);
  // bare urls
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g, (_, pre, url) => pre + stash(`<a href="${url}" rel="noopener nofollow" target="_blank">${url}</a>`));
  // emphasis
  s = s.replace(/(\*\*|__)(?=\S)([\s\S]+?\S)\1/g, '<strong>$2</strong>');
  s = s.replace(/(^|[^\w*])\*(?=\S)([^*]+?\S)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/~~(?=\S)([\s\S]+?\S)~~/g, '<del>$1</del>');

  return s.replace(/\u0000(\d+)\u0000/g, (_, n) => slots[Number(n)]);
}

// ---------------------------------------------------------------------------
// Unified diff renderer
// ---------------------------------------------------------------------------

function diffStats(diff) {
  let add = 0, del = 0;
  for (const l of String(diff ?? '').split('\n')) {
    if (l.startsWith('+++') || l.startsWith('---')) continue;
    if (l.startsWith('+')) add++;
    else if (l.startsWith('-')) del++;
  }
  return { add, del };
}

function renderDiff(diff) {
  const text = String(diff ?? '');
  if (!text.trim()) return '<pre class="diff"><span class="empty">No patch was produced.</span></pre>';
  const out = [];
  let headerShown = false;
  for (const l of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (l.startsWith('diff --git')) {
      const m = l.match(/ b\/(.+)$/);
      out.push(`<span class="f">${esc(m ? m[1] : l)}</span>`);
      headerShown = true;
    } else if (l.startsWith('+++')) {
      if (!headerShown) out.push(`<span class="f">${esc(l.replace(/^\+\+\+\s+(b\/)?/, ''))}</span>`);
      headerShown = false;
    } else if (l.startsWith('---') || l.startsWith('index ') || /^(new|deleted) file mode/.test(l) || /^(similarity|rename|copy) /.test(l) || /^(old|new) mode/.test(l) || l.startsWith('Binary files')) {
      if (l.startsWith('---')) continue;
      out.push(`<span class="h">${esc(l)}</span>`);
    } else if (l.startsWith('@@')) {
      out.push(`<span class="h">${esc(l)}</span>`);
    } else if (l.startsWith('+')) {
      out.push(`<span class="a">${esc(l)}</span>`);
    } else if (l.startsWith('-')) {
      out.push(`<span class="r">${esc(l)}</span>`);
    } else if (l.startsWith('\\')) {
      out.push(`<span class="h">${esc(l)}</span>`);
    } else if (l === '' && out.length === 0) {
      continue;
    } else {
      out.push(`<span class="c">${esc(l || ' ')}</span>`);
    }
  }
  return `<pre class="diff">${out.join('')}</pre>`;
}

// ---------------------------------------------------------------------------
// Shared page chrome
// ---------------------------------------------------------------------------

function layout({ title, description, path, body, scripts = '', canonical }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${esc(canonical || path)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body class="bt">
<div class="wrap">
  <nav>
    <a href="/" aria-label="sudo home"><img class="logo" src="/sudo-logo.png" alt="sudo" width="2092" height="752"></a>
    <div class="links"><a href="/backtests/" class="keep" aria-current="page">Backtests</a><a href="/#how">How it works</a><a href="/#backtest">Request a backtest</a></div>
  </nav>
  <main>
${body}
  </main>
  <footer>
    <div class="row">
      <img class="logo" src="/sudo-logo.png" alt="sudo" width="2092" height="752">
      <div class="meta"><a href="https://runsudo.dev">runsudo.dev</a><a href="mailto:hello@runsudo.dev">hello@runsudo.dev</a></div>
    </div>
  </footer>
</div>
${scripts}
</body>
</html>
`;
}

function crumbs(items) {
  return '<p class="crumbs">' + items.map((it, k) => {
    const last = k === items.length - 1;
    const sep = k ? '<span aria-hidden="true">/</span>' : '';
    return sep + (last ? `<span aria-current="page">${esc(it.label)}</span>` : `<a href="${esc(it.href)}">${esc(it.label)}</a>`);
  }).join('') + '</p>';
}

function pill(verdict, lg = false) {
  return `<span class="pill ${verdict}${lg ? ' lg' : ''}">${VERDICT_LABEL[verdict]}</span>`;
}

function stackedBar(c, thin = false) {
  const total = c.better + c.par + c.worse + c.error || 1;
  const seg = (k) => (c[k] ? `<span class="b-${k}" style="width:${(c[k] / total) * 100}%"></span>` : '');
  const label = `${c.better} better, ${c.par} par, ${c.worse} worse, ${c.error} error`;
  return `<div class="bar${thin ? ' thin' : ''}" role="img" aria-label="${esc(label)}">${seg('better')}${seg('par')}${seg('worse')}${seg('error')}</div>`;
}

function countsRow(c, withError = true) {
  const keys = withError ? VERDICTS : VERDICTS.filter((k) => k !== 'error');
  return '<div class="counts">' + keys.map((k) => `<span class="${k}"><i></i>${c[k]} ${k}</span>`).join('') + '</div>';
}

const runUrl = (repo, run) => `/backtests/${repo.slug}/${run.id}/`;
const ticketUrl = (repo, run, t) => `/backtests/${repo.slug}/${run.id}/${t.number}/`;

// ---------------------------------------------------------------------------
// Data loading and consistency checks
// ---------------------------------------------------------------------------

const index = readJSON(join(DATA, 'index.json'));
const warnings = [];

for (const repo of index.repos) {
  const seen = new Set();
  for (const run of repo.runs || []) {
    if (!run.id || !RUN_ID_RE.test(run.id)) throw new Error(`${repo.slug}: run dated ${run.date} has no usable "id" (got ${JSON.stringify(run.id)}); runs are addressed by id`);
    if (seen.has(run.id)) throw new Error(`${repo.slug}: run id ${run.id} appears twice in index.json`);
    seen.add(run.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(run.date))) throw new Error(`${repo.slug}/${run.id}: "date" must be YYYY-MM-DD (got ${JSON.stringify(run.date)})`);
  }
  repo.runs = (repo.runs || []).slice().sort(byNewest);
  for (const run of repo.runs) {
    const key = `${repo.slug}/${run.id}`;
    const file = join(DATA, repo.slug, run.id, 'tickets.json');
    run.ticketList = existsSync(file) ? readJSON(file) : null;
    if (run.ticketList) {
      const c = { better: 0, par: 0, worse: 0, error: 0 };
      for (const t of run.ticketList) c[displayVerdict(t)]++;
      for (const k of VERDICTS) {
        if ((run[k] ?? 0) !== c[k]) warnings.push(`${key}: index.json says ${k}=${run[k] ?? 0}, tickets.json has ${c[k]}; using tickets.json`);
      }
      if (run.tickets !== run.ticketList.length) warnings.push(`${key}: index.json says tickets=${run.tickets}, tickets.json has ${run.ticketList.length}; using tickets.json`);
      Object.assign(run, c, { tickets: run.ticketList.length });
    } else {
      const legacy = join(DATA, repo.slug, run.date, 'tickets.json');
      warnings.push(`${key}: no tickets.json at data/backtests/${key}/, run page will list no tickets${existsSync(legacy) ? ` (found one under the date folder ${run.date}; move it to ${run.id})` : ''}`);
      for (const k of VERDICTS) run[k] = run[k] ?? 0;
      const sum = VERDICTS.reduce((s, k) => s + run[k], 0);
      if (run.tickets !== sum) warnings.push(`${key}: counts sum to ${sum} but tickets=${run.tickets}`);
    }
    run.pct = pct(run.better, run.tickets);
  }
  repo.latest = repo.status !== 'pending' && repo.runs.length ? repo.runs[0] : null;
}

const featured = index.repos.find((r) => r.latest) || null;

// ---------------------------------------------------------------------------
// Chart (inline SVG)
// ---------------------------------------------------------------------------

const PALETTE = ['#f5e900', '#8ab4f8', '#e39ad6', '#7fd1d1', '#f0b27a', '#b5a7f5'];

function chart() {
  const series = index.repos.filter((r) => r.runs.length).map((r, k) => ({ repo: r, color: PALETTE[k % PALETTE.length] }));
  const runDates = series.flatMap((s) => s.repo.runs.map((r) => r.date));
  const evDates = (index.events || []).map((e) => e.date);
  const all = [...runDates, ...evDates].map(dateMs);
  // Runs sit at their date plus the time of day from the run id, so two runs on one day
  // appear as two nearby points instead of one on top of the other.
  all.push(...series.flatMap((s) => s.repo.runs.map(runMs)));
  if (!all.length) return '<div class="pending">No runs yet.</div>';

  const DAY = 86400000;
  let min = Math.min(...all), max = Math.max(...all);
  const pad = Math.max(DAY, (max - min) * 0.12);
  min -= pad; max += pad;

  const W = 960, H = 340, ml = 64, mr = 26, mt = 62, mb = 42;
  const iw = W - ml - mr, ih = H - mt - mb;
  const x = (ms) => ml + ((ms - min) / (max - min)) * iw;
  const y = (p) => mt + ih - (p / 100) * ih;

  const parts = [];
  // y axis title
  parts.push(`<text class="axis title" transform="translate(14 ${mt + ih / 2}) rotate(-90)" text-anchor="middle">% marked better</text>`);
  // y grid + labels
  for (const p of [0, 25, 50, 75, 100]) {
    parts.push(`<line class="grid" x1="${ml}" x2="${W - mr}" y1="${y(p)}" y2="${y(p)}"/>`);
    parts.push(`<text class="axis" x="${ml - 8}" y="${y(p) + 4}" text-anchor="end">${p}%</text>`);
  }
  // x labels: unique run dates, thinned if crowded
  const uniq = [...new Set(runDates)].sort();
  const step = Math.ceil(uniq.length / 8);
  uniq.forEach((d, k) => {
    if (k % step) return;
    // Centre the label on noon, since points sit at their run's time of day.
    parts.push(`<text class="axis" x="${x(dateMs(d) + DAY / 2)}" y="${H - mb + 20}" text-anchor="middle">${fmtShort(d)}</text>`);
  });
  // events
  // Labels alternate between sitting above the plot and hanging inside it at
  // staggered heights, and swap sides of the line, so nearby events don't collide.
  const LEVELS = [mt - 14, mt + 24, mt + 60, mt + 96];
  (index.events || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((e, k) => {
    const ex = x(dateMs(e.date));
    const ly = LEVELS[k % LEVELS.length];
    const textW = e.label.length * 6.8 + 12;
    let side = k % 2 ? 'start' : 'end';
    if (side === 'end' && ex - textW < ml) side = 'start';
    if (side === 'start' && ex + textW > W - mr) side = 'end';
    const tx = side === 'start' ? ex + 8 : ex - 8;
    const bx = side === 'start' ? tx - 4 : tx - textW + 4;
    parts.push(`<line class="ev-line" x1="${ex}" x2="${ex}" y1="${mt - 4}" y2="${H - mb}"><title>${esc(fmtDate(e.date))}: ${esc(e.label)}</title></line>`);
    parts.push(`<rect class="ev-bg" x="${bx}" y="${ly - 11}" width="${textW}" height="16" rx="3"/>`);
    parts.push(`<text class="ev-label" x="${tx}" y="${ly}" text-anchor="${side}">${esc(e.label)}</text>`);
  });
  // lines and points
  for (const s of series) {
    const pts = s.repo.runs.slice().sort((a, b) => -byNewest(a, b));
    if (pts.length > 1) {
      parts.push(`<polyline class="line" stroke="${s.color}" points="${pts.map((r) => `${x(runMs(r))},${y(r.pct)}`).join(' ')}"/>`);
    }
    for (const r of pts) {
      const label = `${fmtDate(r.date)} · ${s.repo.name} · ${r.id}: ${r.pct}% better (${r.better} better, ${r.par} par, ${r.worse} worse, ${r.error} error)${r.notes ? '. ' + r.notes : ''}`;
      parts.push(`<a href="${runUrl(s.repo, r)}" data-tip data-date="${esc(fmtDate(r.date))}" data-run="${esc(r.id)}" data-repo="${esc(s.repo.name)}" data-pct="${r.pct}" data-better="${r.better}" data-par="${r.par}" data-worse="${r.worse}" data-error="${r.error}" data-notes="${esc(r.notes || '')}"><circle class="hit" cx="${x(runMs(r))}" cy="${y(r.pct)}" r="16"/><circle class="pt" fill="${s.color}" cx="${x(runMs(r))}" cy="${y(r.pct)}" r="7"><title>${esc(label)}</title></circle></a>`);
    }
  }


  return `<div class="chart" id="chart">
<div class="scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Percentage of tickets judged better than the merged fix, per run and repo">
${parts.join('\n')}
</svg></div>
<div class="legend">${series.map((s) => `<span><i class="sw" style="background:${s.color}"></i>${esc(s.repo.slug)}</span>`).join('')}</div>
<p class="caption">Each point is one run on that repo's fixed ticket sample, placed at the day it ran; two runs on one day sit side by side. Dotted lines and text label any changes we made.</p>
<div class="tip" id="tip" role="status"></div>
</div>`;
}

const CHART_JS = `<script>
(function(){
  var c=document.getElementById('chart'),tip=document.getElementById('tip');if(!c||!tip)return;
  var cur=null;
  function show(a){
    var d=a.dataset;
    tip.innerHTML='<b>'+d.repo+'</b>'+d.date+' · '+d.pct+'% better'+(d.run?'<div class="muted small">'+d.run+'</div>':'')
      +'<div class="counts"><span class="better"><i></i>'+d.better+'</span><span class="par"><i></i>'+d.par+'</span><span class="worse"><i></i>'+d.worse+'</span><span class="error"><i></i>'+d.error+'</span></div>'
      +(d.notes?'<div class="muted" style="margin-top:6px">'+d.notes+'</div>':'');
    var r=a.querySelector('circle.pt').getBoundingClientRect(),cr=c.getBoundingClientRect();
    tip.style.display='block';
    var left=r.left-cr.left+r.width/2-tip.offsetWidth/2;
    left=Math.max(8,Math.min(left,cr.width-tip.offsetWidth-8));
    var top=r.top-cr.top-tip.offsetHeight-12;if(top<4)top=r.bottom-cr.top+12;
    tip.style.left=left+'px';tip.style.top=top+'px';cur=a;
  }
  function hide(){tip.style.display='none';cur=null}
  c.addEventListener('mouseover',function(e){var a=e.target.closest&&e.target.closest('a[data-tip]');if(a)show(a)});
  c.addEventListener('mouseout',function(e){var a=e.target.closest&&e.target.closest('a[data-tip]');if(a)hide()});
  c.addEventListener('focusin',function(e){var a=e.target.closest&&e.target.closest('a[data-tip]');if(a)show(a)});
  c.addEventListener('focusout',hide);
  c.addEventListener('touchend',function(e){var a=e.target.closest&&e.target.closest('a[data-tip]');if(!a)return;if(cur!==a){e.preventDefault();show(a)}},{passive:false});
  document.addEventListener('touchstart',function(e){if(!e.target.closest||!e.target.closest('#chart'))hide()},{passive:true});
})();
</script>`;

// ---------------------------------------------------------------------------
// Page 1: overview
// ---------------------------------------------------------------------------

function overviewPage() {
  const chartTitle = 'Our progress:';

  const verdictCards = `<div class="verdicts">
  <div class="vcard better">${pill('better')}<p>Our patch passes the full test suite and the judge preferred it to the merged fix.</p></div>
  <div class="vcard par">${pill('par')}<p>Both are equally good.</p></div>
  <div class="vcard worse">${pill('worse')}<p>The merged fix was better, or our patch broke a test that passed before. We show every one.</p></div>
  <div class="vcard error">${pill('error')}<p>The harness couldn't finish the ticket. Counted in the total, never dropped.</p></div>
</div>`;

  const rows = index.repos.map((repo) => {
    const href = `/backtests/${repo.slug}/`;
    const r = repo.latest;
    if (!r) {
      return `<tr class="link"><td class="title"><a href="${href}">${esc(repo.name)}</a></td><td class="muted">${esc((repo.languages || []).join(', '))}</td><td colspan="3" class="muted">Rerun scheduled</td></tr>`;
    }
    return `<tr class="link"><td class="title"><a href="${href}">${esc(repo.name)}</a></td><td class="muted">${esc((repo.languages || []).join(', '))}</td><td class="id"><a href="${runUrl(repo, r)}">${fmtDate(r.date)}</a></td><td>${stackedBar(r, true)}${countsRow(r, r.error > 0)}</td><td class="num">${r.pct}%</td></tr>`;
  }).join('\n');

  const body = `
<div class="intro">
  <h1 class="big">How Our Software Factory Compares</h1>
  <p class="lead">We replay real, already-fixed GitHub issues from public repos. Our software factory gets the issue and the code as it was before the fix, works in an isolated container with the network locked down, and never sees the real fix. A blind judge then compares our patch to the one maintainers merged, labelled only A and B.</p>
</div>

<section class="first">
  <h2>${chartTitle}</h2>
  ${chart()}
</section>

<section>
  <h2>How to read a verdict</h2>
  ${verdictCards}
</section>

<section>
  <h2>Repos</h2>
  <div class="tablewrap"><table class="table">
    <thead><tr><th>Repo</th><th>Language</th><th>Latest run</th><th>Better · par · worse</th><th class="num">% better</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table></div>
</section>`;

  return layout({
    title: 'Backtests — sudo',
    description: 'Public results of replaying real, already-fixed GitHub issues: every repo, every run, every ticket, with the verdict and both patches.',
    path: '/backtests/',
    body,
    scripts: CHART_JS,
  });
}

// ---------------------------------------------------------------------------
// Page 2: repo / run
// ---------------------------------------------------------------------------

const FILTER_JS = `<script>
(function(){
  document.querySelectorAll('.runbody').forEach(function(panel){
    var f=panel.querySelector('.filters');if(!f)return;
    var rows=panel.querySelectorAll('tr[data-verdict]');
    f.addEventListener('click',function(e){
      var b=e.target.closest('button[data-filter]');if(!b)return;
      var v=b.getAttribute('data-filter');
      f.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
      rows.forEach(function(r){r.hidden=v!=='all'&&r.getAttribute('data-verdict')!==v});
    });
  });
})();
</script>`;

function ticketsTable(repo, run) {
  const tickets = run.ticketList || [];
  if (!tickets.length) {
    return `<div class="pending">Ticket details for this run are not published yet.</div>${run.footnote ? `<p class="footnote">${esc(run.footnote)}</p>` : ''}`;
  }
  const counts = { all: tickets.length, better: run.better, par: run.par, worse: run.worse, error: run.error };
  const filters = '<div class="filters" role="group" aria-label="Filter tickets by verdict">'
    + `<button type="button" data-filter="all" aria-pressed="true">All ${counts.all}</button>`
    + VERDICTS.filter((v) => v !== 'error' || counts.error > 0).map((v) => `<button type="button" class="${v}" data-filter="${v}" aria-pressed="false">${VERDICT_LABEL[v]} ${counts[v]}</button>`).join('')
    + '</div>';
  const rows = tickets.map((t) => {
    const v = displayVerdict(t);
    const tests = v === 'error' || !t.tests ? '<span class="muted">Not run</span>'
      : t.tests.new_failures ? `<span class="pill worse">${plural(t.tests.new_failures, 'failing', 'failing')}</span>` : 'No new failures';
    const lines = `${t.lines ? fmtInt(t.lines.ours) : '—'} / ${t.lines ? fmtInt(t.lines.merged) : '—'}`;
    return `<tr class="link" data-verdict="${v}"><td class="id">#${esc(t.number)}</td><td class="title"><a href="${ticketUrl(repo, run, t)}">${inline(t.title || '')}</a></td><td>${pill(v)}</td><td class="num">${lines}</td><td class="tests">${tests}</td></tr>`;
  }).join('\n');
  return `${filters}
  <div class="tablewrap"><table class="table">
    <thead><tr><th>Issue</th><th>Title</th><th>Verdict</th><th class="num">Lines ours / merged</th><th>Test suite</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table></div>
  ${run.footnote ? `<p class="footnote">${esc(run.footnote)}</p>` : ''}`;
}

function runPage(repo, run, { isRepoPage }) {
  const crumbItems = [{ label: 'Backtests', href: '/backtests/' }];
  if (isRepoPage || !run) crumbItems.push({ label: repo.slug });
  else crumbItems.push({ label: repo.slug, href: `/backtests/${repo.slug}/` }, { label: run.id });

  const header = `
${crumbs(crumbItems)}
<h1>${esc(repo.name)}</h1>
<p class="lead">${esc(repo.description || '')}</p>`;

  if (!run) {
    const body = `${header}
<section><div class="pending">No valid run yet. Rerun scheduled.</div></section>`;
    return layout({ title: `${repo.name} backtests — sudo`, description: `Backtest results for ${repo.name}.`, path: `/backtests/${repo.slug}/`, body });
  }

  const summary = `<div class="card summary">
  <p class="k">${isRepoPage ? 'Latest run' : 'This run'} · ${fmtDate(run.date)} · <span class="runid">${esc(run.id)}</span></p>
  <p class="big">${run.pct}%<small>judged better than the merged fix</small></p>
  <p class="sub">${run.better} of ${run.tickets} tickets. ${run.notes ? esc(run.notes) + '.' : ''}</p>
  ${stackedBar(run)}
  ${countsRow(run)}
</div>`;

  const runs = repo.runs.map((r) => {
    const open = r === run;
    const tickets = r.ticketList || [];
    return `<details class="run" id="${esc(r.id)}"${open ? ' open' : ''}>
  <summary>
    <span class="date">${fmtDate(r.date)}<span class="runid">${esc(r.id)}</span></span>
    <span class="bars">${stackedBar(r, true)}<span class="counts"><span class="better">${r.better} better</span><span class="par">${r.par} par</span><span class="worse">${r.worse} worse</span><span class="error">${r.error} error</span></span></span>
    <span class="notes">${esc(r.notes || '')}</span>
    <span class="meta">${plural(tickets.length || r.tickets, 'ticket')} · <a href="${runUrl(repo, r)}">permalink</a></span>
  </summary>
  <div class="runbody">
${ticketsTable(repo, r)}
  </div>
</details>`;
  }).join('\n');

  const body = `${header}
${summary}
<section>
  <div class="sectionhead"><h2>Runs on this sample</h2><span class="muted small">Click a run to see its tickets</span></div>
  <div class="runs">
${runs}
  </div>
</section>`;

  return layout({
    title: `${repo.name} · ${fmtDate(run.date)} — sudo backtests`,
    description: `${run.better} of ${run.tickets} tickets judged better than the merged fix on ${repo.name}, run ${fmtDate(run.date)}.`,
    path: isRepoPage ? `/backtests/${repo.slug}/` : runUrl(repo, run),
    canonical: runUrl(repo, run),
    body,
    scripts: FILTER_JS,
  });
}

// ---------------------------------------------------------------------------
// Page 3: ticket
// ---------------------------------------------------------------------------

const COLLAPSE_JS = `<script>
(function(){
  document.querySelectorAll('.collapse').forEach(function(c){
    var b=c.querySelector('.toggle');if(!b)return;
    b.addEventListener('click',function(){
      var open=c.hasAttribute('data-expanded');
      if(open){c.removeAttribute('data-expanded');c.setAttribute('data-collapsed','');b.textContent='Show full issue';b.setAttribute('aria-expanded','false');c.scrollIntoView({block:'nearest'})}
      else{c.removeAttribute('data-collapsed');c.setAttribute('data-expanded','');b.textContent='Collapse issue';b.setAttribute('aria-expanded','true')}
    });
  });
})();
</script>`;

function ticketPage(repo, run, t, prev, next) {
  const v = displayVerdict(t);
  const judge = t.judge && typeof t.judge === 'object' ? t.judge : null;
  const agentIs = judge && String(judge.agent_is || '').toUpperCase() === 'B' ? 'B' : 'A';
  const mergedIs = agentIs === 'A' ? 'B' : 'A';

  const verdictLine = {
    better: 'Our patch was judged better than the merged fix.',
    par: 'Our patch was judged on par with the merged fix.',
    worse: 'The merged fix was judged better than our patch.',
    error: "The harness couldn't finish this ticket.",
  }[v];

  let judgeBlock = '';
  if (judge && judge.reasoning) {
    judgeBlock = `
  <p class="map">In this judgment, <b>Patch ${agentIs} = our agent</b>, <b>Patch ${mergedIs} = the merged fix</b>.</p>
  <pre class="reasoning">${esc(judge.reasoning)}</pre>
  <p class="note">The judge saw only the two patches, labelled A and B in random order, with issue links and version numbers removed. The reasoning above is shown verbatim.</p>`;
  } else {
    judgeBlock = `
  <p class="note">${t.error ? esc(t.error) + '. ' : ''}No judgment was produced for this ticket. It counts as an error in the run total.</p>`;
  }

  const tests = t.tests || null;
  const testsCard = tests
    ? `<p class="v">${tests.new_failures ? `<span style="color:var(--bad)">${plural(tests.new_failures, 'new failure')}</span>` : '<span style="color:var(--good)">No new failures</span>'}</p><p class="d">${fmtInt(tests.passed)} passed · ${fmtInt(tests.skipped)} skipped · ${fmtInt(tests.total)} total</p>`
    : '<p class="v">Not run</p><p class="d">The harness did not reach the test stage</p>';
  const auditV = t.audit && t.audit.verdict ? String(t.audit.verdict) : 'unknown';
  const auditCard = `<p class="v" style="color:${auditV === 'clean' ? 'var(--good)' : 'var(--bad)'}">${esc(auditV.charAt(0).toUpperCase() + auditV.slice(1))}</p><p class="d">${auditV === 'clean' ? 'No sign the agent saw the real fix' : 'See the audit notes for this run'}</p>`;

  const stats = `<div class="stats">
  <div class="card"><p class="k">Solve</p><p class="v">${fmtDuration(t.solve && t.solve.duration_s)}<small>${t.solve && t.solve.turns != null ? plural(t.solve.turns, 'turn') : ''}</small></p><p class="d">Wall-clock time in the container</p></div>
  <div class="card"><p class="k">Full test suite</p>${testsCard}</div>
  <div class="card"><p class="k">Contamination audit</p>${auditCard}</div>
  <div class="card"><p class="k">Patch size</p><p class="v">${t.lines ? fmtInt(t.lines.ours) : '—'}<small>vs ${t.lines ? fmtInt(t.lines.merged) : '—'} merged</small></p><p class="d">Changed lines, ours vs merged</p></div>
</div>`;

  const issueLines = String(t.issue_md || '').split('\n').length;
  const collapsed = issueLines > 15;
  const issue = `<section>
  <div class="sectionhead"><h2>The issue</h2><a class="small" href="${esc(t.issue_url)}" rel="noopener" target="_blank">View on GitHub</a></div>
  <div class="card collapse"${collapsed ? ' data-collapsed=""' : ''}>
    <div class="md">${renderMarkdown(t.issue_md)}</div>
    ${collapsed ? '<button type="button" class="toggle" aria-expanded="false">Show full issue</button>' : ''}
  </div>
</section>`;

  const ours = diffStats(t.patches && t.patches.ours);
  const merged = diffStats(t.patches && t.patches.merged);
  const patches = `<section>
  <h2>The two patches</h2>
  <div class="patches">
    <div class="patch"><div class="ph"><span>Our patch</span><span class="pm"><span class="a">+${ours.add}</span> <span class="r">−${ours.del}</span></span></div>${renderDiff(t.patches && t.patches.ours)}</div>
    <div class="patch"><div class="ph"><span>Merged fix · <a href="${esc(t.pr_url)}" rel="noopener" target="_blank">PR #${esc(t.pr)}</a></span><span class="pm"><span class="a">+${merged.add}</span> <span class="r">−${merged.del}</span></span></div>${renderDiff(t.patches && t.patches.merged)}</div>
  </div>
</section>`;

  const summary = t.agent_summary_md ? `<section>
  <h2>What the agent reported</h2>
  <div class="card"><div class="md">${renderMarkdown(t.agent_summary_md)}</div></div>
</section>` : '';

  const pager = `<nav class="pager" aria-label="Ticket navigation">
  ${prev ? `<a href="${ticketUrl(repo, run, prev)}">Previous · #${esc(prev.number)}</a>` : '<span class="disabled">Previous</span>'}
  <a class="mid" href="${runUrl(repo, run)}">All tickets in this run</a>
  ${next ? `<a href="${ticketUrl(repo, run, next)}">Next · #${esc(next.number)}</a>` : '<span class="disabled">Next</span>'}
</nav>`;

  const body = `
${crumbs([{ label: 'Backtests', href: '/backtests/' }, { label: repo.slug, href: `/backtests/${repo.slug}/` }, { label: run.id, href: runUrl(repo, run) }, { label: `#${t.number}` }])}
<div class="tk-head">
  <span>Issue <a href="${esc(t.issue_url)}" rel="noopener" target="_blank">#${esc(t.number)}</a></span>
  <span>Merged fix <a href="${esc(t.pr_url)}" rel="noopener" target="_blank">PR #${esc(t.pr)}</a></span>
  <span>Run ${fmtDate(run.date)} · <span class="runid">${esc(run.id)}</span></span>
  <span>${esc(repo.name)}</span>
</div>
<h1 class="ticket-title">${inline(t.title || '')}</h1>

<div class="verdict-block">
  ${pill(v, true)}
  <p class="line">${verdictLine}</p>${judgeBlock}
</div>

${stats}

${issue}

${patches}

${summary}

${pager}`;

  return layout({
    title: `#${t.number} ${t.title || ''} — ${repo.name} backtest`,
    description: `${verdictLine} Issue #${t.number} in ${repo.name}, run ${fmtDate(run.date)}.`,
    path: ticketUrl(repo, run, t),
    body,
    scripts: COLLAPSE_JS,
  });
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

rmSync(OUT, { recursive: true, force: true });
let pages = 0;

writePage('', overviewPage()); pages++;

for (const repo of index.repos) {
  writePage(repo.slug, runPage(repo, repo.latest, { isRepoPage: true })); pages++;
  for (const run of repo.runs) {
    writePage(`${repo.slug}/${run.id}`, runPage(repo, run, { isRepoPage: false })); pages++;
    const tickets = run.ticketList || [];
    tickets.forEach((t, k) => {
      writePage(`${repo.slug}/${run.id}/${t.number}`, ticketPage(repo, run, t, tickets[k - 1], tickets[k + 1])); pages++;
    });
  }
}

for (const w of warnings) console.warn('warning:', w);
console.log(`Wrote ${pages} pages to ${OUT}`);
