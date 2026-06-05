#!/usr/bin/env node
// Mutation survivor analysis for the engine/compiler slice.
// Reads a Stryker JSON report and prints actionable survivor breakdowns.
//
//   node scripts/mutation-survivors.mjs [reportPath]            # summary + per-file table
//   node scripts/mutation-survivors.mjs [reportPath] --file X   # survivor specs for one file (substring match)
//   node scripts/mutation-survivors.mjs [reportPath] --clusters # propose file clusters for fan-out
//
// Default reportPath: reports/mutation/mutation.json.
import fs from 'node:fs';

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const positional = args.filter((a) => !a.startsWith('--'));
const reportPath = positional[0] ?? 'reports/mutation/mutation.json';
const fileFilter = flags.find((f) => f === '--file') ? args[args.indexOf('--file') + 1] : null;

const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const files = data.files || {};
const PREFIX = 'src/engine/compiler/';
const GAP = new Set(['Survived', 'NoCoverage']);

const rows = [];
let total = 0,
  killed = 0,
  survived = 0,
  noCov = 0,
  timeout = 0,
  other = 0;
const byMutator = {};
for (const [path, info] of Object.entries(files)) {
  const muts = info.mutants || [];
  let s = 0,
    nc = 0,
    k = 0;
  for (const m of muts) {
    total++;
    if (m.status === 'Killed') (killed++, k++);
    else if (m.status === 'Survived') {
      survived++;
      s++;
      byMutator[m.mutatorName] = (byMutator[m.mutatorName] || 0) + 1;
    } else if (m.status === 'NoCoverage') {
      noCov++;
      nc++;
      byMutator[m.mutatorName] = (byMutator[m.mutatorName] || 0) + 1;
    } else if (m.status === 'Timeout') timeout++;
    else other++;
  }
  rows.push({ path, short: path.replace(PREFIX, ''), s, nc, k, total: muts.length });
}
const score = (killed / (killed + survived + noCov)) * 100;

if (fileFilter) {
  const hits = rows.filter((r) => r.path.includes(fileFilter));
  for (const r of hits) {
    const info = files[r.path];
    console.log(`\n##### ${r.short}  (${r.s}s + ${r.nc}nc of ${r.total})`);
    const gaps = info.mutants
      .filter((m) => GAP.has(m.status))
      .sort((a, b) => a.location.start.line - b.location.start.line);
    for (const m of gaps) {
      const cov = m.status === 'NoCoverage' ? 'NOCOV' : `cov×${(m.coveredBy || []).length}`;
      console.log(
        `  L${m.location.start.line}:${m.location.start.column}`.padEnd(12),
        m.mutatorName.padEnd(22),
        cov.padEnd(8),
        '→ ' + JSON.stringify(m.replacement).slice(0, 64),
      );
    }
  }
  process.exit(0);
}

console.log(`report: ${reportPath}`);
console.log(
  `TOTAL ${total} | killed ${killed} survived ${survived} noCoverage ${noCov} timeout ${timeout} other ${other}`,
);
console.log(`MUTATION SCORE = ${score.toFixed(2)}%  (killed / (killed+survived+noCoverage))`);

rows.sort((a, b) => b.s + b.nc - (a.s + a.nc));
console.log(
  `\nfiles: ${rows.length} | fully killed: ${rows.filter((r) => r.s + r.nc === 0).length} | with gaps: ${rows.filter((r) => r.s + r.nc > 0).length}`,
);
console.log('\n=== FILES WITH GAPS (survived+nocov), descending ===');
for (const r of rows.filter((r) => r.s + r.nc > 0))
  console.log(
    String(r.s + r.nc).padStart(4),
    `(${String(r.s).padStart(3)}s +${String(r.nc).padStart(3)}nc) of ${String(r.total).padStart(4)}`,
    ' ',
    r.short,
  );
console.log('\n=== GAPS BY MUTATOR ===');
for (const [k, v] of Object.entries(byMutator).sort((a, b) => b[1] - a[1]))
  console.log(String(v).padStart(4), k);

if (flags.includes('--clusters')) {
  // Group files-with-gaps by their directory + leading filename token, for fan-out batching.
  const clusters = {};
  for (const r of rows.filter((r) => r.s + r.nc > 0)) {
    const dir = r.short.includes('/') ? r.short.slice(0, r.short.lastIndexOf('/')) : '.';
    const base = r.short.slice(r.short.lastIndexOf('/') + 1).replace(/\.ts$/, '');
    const token = base.match(/^[a-z]+/i)?.[0] || base;
    const key = `${dir}/${token}*`;
    (clusters[key] = clusters[key] || { files: [], gaps: 0 }).files.push(r.short);
    clusters[key].gaps += r.s + r.nc;
  }
  console.log('\n=== PROPOSED CLUSTERS (dir/token*) ===');
  for (const [k, v] of Object.entries(clusters).sort((a, b) => b[1].gaps - a[1].gaps))
    console.log(String(v.gaps).padStart(4), 'gaps |', v.files.length, 'files |', k);
}
