#!/usr/bin/env node
// pdd-dashboard.mjs — render docs/pdd/history.jsonl as docs/pdd/dashboard.html.
// Inline SVG line charts, zero runtime deps. Open the HTML in a browser.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const histPath = path.join(root, "docs/pdd/history.jsonl");
const rows = fs
    .readFileSync(histPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

// MAP atlas burn-down lives in a PARALLEL feed (changes on atlas re-runs, not per commit).
const atlasPath = path.join(root, "docs/pdd/atlas-history.jsonl");
const atlasRows = fs.existsSync(atlasPath)
    ? fs
          .readFileSync(atlasPath, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l))
    : [];

// key, label, target line, and direction (higher-is-better → target is a floor).
// A metric with feed:"atlas" reads atlasRows instead of the per-commit history rows.
const METRICS = [
    { label: "Mutation score (engine/compiler)", unit: "%", target: 90, higher: true, get: (r) => r.mutationScore },
    { label: "Boundary violations", unit: "", target: 0, higher: false, get: (r) => r.violations },
    { label: "Coverage — statements", unit: "%", target: 81, higher: true, get: (r) => r.coverage?.statements },
    { label: "Coverage — branches", unit: "%", target: 68, higher: true, get: (r) => r.coverage?.branches },
    { label: "Coverage — functions", unit: "%", target: 78, higher: true, get: (r) => r.coverage?.functions },
    { label: "Coverage — lines", unit: "%", target: 84, higher: true, get: (r) => r.coverage?.lines },
    { label: "ESLint suppressions (debt)", unit: "", target: null, higher: false, get: (r) => r.suppressions },
    { label: "Test count", unit: "", target: null, higher: true, get: (r) => r.tests },
    // MAP — System Truth Atlas burn-down (feed: docs/pdd/atlas-history.jsonl, derived from atlas.json). All → 0.
    { label: "MAP — open risks (high)", unit: "", target: 0, higher: false, feed: "atlas", get: (r) => r.openRisksHigh },
    { label: "MAP — open risks (total)", unit: "", target: 0, higher: false, feed: "atlas", get: (r) => r.openRisksTotal },
    { label: "MAP — footguns open", unit: "", target: 0, higher: false, feed: "atlas", get: (r) => r.footgunsOpen },
    { label: "MAP — silent failures (real)", unit: "", target: 0, higher: false, feed: "atlas", get: (r) => r.silentFailuresReal },
    { label: "MAP — coverage gaps", unit: "", target: 0, higher: false, feed: "atlas", get: (r) => r.coverageGaps },
];

const W = 520, H = 170, P = 36;
const fmt = (v, unit) => (unit ? v.toFixed(1) : String(Math.round(v)));

function chart(m) {
    const src = m.feed === "atlas" ? atlasRows : rows;
    const pts = src
        .map((r) => ({ commit: r.commit, y: m.get(r) }))
        .filter((p) => p.y != null);
    if (pts.length === 0)
        return `<div class="card empty"><h3>${m.label}</h3><p>no data yet</p></div>`;

    const ys = pts.map((p) => p.y).concat(m.target != null ? [m.target] : []);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;

    const x = (i) => P + (pts.length === 1 ? (W - 2 * P) / 2 : (i / (pts.length - 1)) * (W - 2 * P));
    const y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);

    const linePath = pts.map((p, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
    const dots = pts
        .map((p, k) => `<circle cx="${x(k).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="2.6"><title>${p.commit}: ${p.y}${m.unit}</title></circle>`)
        .join("");
    const targetKind = m.higher ? "floor" : "max";
    const targetLine =
        m.target != null
            ? `<line x1="${P}" y1="${y(m.target).toFixed(1)}" x2="${W - P}" y2="${y(m.target).toFixed(1)}" class="target"/>` +
              `<text x="${W - P}" y="${(y(m.target) - 4).toFixed(1)}" class="tlbl" text-anchor="end">${targetKind} ${m.target}</text>`
            : "";

    const latest = pts[pts.length - 1].y;
    let ok = null;
    if (m.target != null) ok = m.higher ? latest >= m.target : latest <= m.target;
    let badge = "";
    if (ok === true) badge = "ok";
    else if (ok === false) badge = "bad";

    return `<div class="card">
    <h3>${m.label}<span class="latest ${badge}">${latest}${m.unit}</span></h3>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <text x="6" y="${(P + 4).toFixed(1)}" class="ax">${fmt(hi, m.unit)}</text>
      <text x="6" y="${(H - P + 4).toFixed(1)}" class="ax">${fmt(lo, m.unit)}</text>
      ${targetLine}
      <path d="${linePath}" class="series"/>
      ${dots}
    </svg>
  </div>`;
}

const last = rows[rows.length - 1];
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>PDD Pass — Proof Trends</title>
<style>
  :root{color-scheme:dark}
  body{font:14px/1.5 system-ui,-apple-system,sans-serif;margin:24px;background:#0f1115;color:#e6e6e6}
  h1{margin:0 0 2px;font-size:20px}
  .sub{color:#9aa0aa;margin:0 0 20px;font-size:13px}
  .sub code{color:#cdd3dd}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
  .card{background:#171a21;border:1px solid #232733;border-radius:10px;padding:12px 14px}
  .card h3{margin:0 0 4px;font-size:13px;font-weight:600;display:flex;justify-content:space-between;align-items:baseline;gap:8px;color:#c3c9d4}
  .latest{font-size:15px;font-weight:700;color:#cdd3dd}
  .latest.ok{color:#5dd39e}.latest.bad{color:#ff6b6b}
  svg{width:100%;height:auto;display:block}
  .series{fill:none;stroke:#6ea8fe;stroke-width:2}
  circle{fill:#6ea8fe}
  .target{stroke:#5dd39e;stroke-dasharray:4 3;stroke-width:1;opacity:.55}
  .tlbl{fill:#5dd39e;font-size:9px}
  .ax{fill:#5a606b;font-size:9px}
  .empty p{color:#5a606b;font-size:12px;margin:18px 0}
  footer{margin-top:22px;color:#5a606b;font-size:12px}
</style></head><body>
  <h1>PDD Pass — Proof Trends</h1>
  <p class="sub">${rows.length} snapshot${rows.length === 1 ? "" : "s"} · latest <code>${last.commit}</code> · ${last.ts}</p>
  <div class="grid">${METRICS.map(chart).join("")}</div>
  <footer>Generated by <code>pdd:dashboard</code> from <code>docs/pdd/history.jsonl</code>. Add a point with <code>pdd:snapshot</code>.</footer>
</body></html>`;

const out = path.join(root, "docs/pdd/dashboard.html");
fs.writeFileSync(out, html);
console.log("wrote", path.relative(root, out), `· ${rows.length} snapshots`);
