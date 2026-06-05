#!/usr/bin/env node
// pdd-snapshot.mjs — append one PDD proof-trend data point to docs/pdd/history.jsonl.
//
// It HARVESTS the gates' latest machine outputs (it does not re-run them), so values
// are "as of the last gate run". Run it after the gates pass — e.g. before/at a merge.
// One row per commit: re-running on the same commit replaces that row.
//
//   node scripts/pdd-snapshot.mjs                          # HEAD: violations + suppressions only
//   node scripts/pdd-snapshot.mjs --gates coverage,tests   # + record those (caller vouches they ran)
//   node scripts/pdd-snapshot.mjs --commit X               # backfill committed metrics at commit X
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const argv = process.argv.slice(2);
const commitArg = (() => {
    const i = argv.indexOf("--commit");
    return i >= 0 ? argv[i + 1] : null;
})();
// Volatile metrics come from un-stamped output files (mutation.json, coverage
// summary, vitest results). Record one ONLY when the caller asserts via --gates
// that its gate just ran at HEAD — so a snapshot can never misattribute a stale
// result to the wrong commit. (violations + suppressions are read from committed
// files and are always accurate at HEAD, so they need no assertion.)
const gates = (() => {
    const i = argv.indexOf("--gates");
    return new Set(i >= 0 ? argv[i + 1].split(",").map((s) => s.trim()) : []);
})();
const fresh = (gate) => !commitArg && gates.has(gate);

const git = (...args) =>
    execFileSync("git", args, { encoding: "utf8" }).trim();
const readJSON = (p) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
    } catch {
        return null;
    }
};

const ref = commitArg ?? "HEAD";
const commit = git("rev-parse", "--short", ref);
const ts = git("show", "-s", "--format=%cI", ref);

// At a specific commit, read the versioned files from that commit; otherwise the tree.
const atCommit = (p) => {
    if (!commitArg) return readJSON(p);
    try {
        return JSON.parse(git("show", `${ref}:${p}`));
    } catch {
        return null;
    }
};

const baseline = atCommit(".dependency-cruiser-known-violations.json");
const violations = Array.isArray(baseline) ? baseline.length : null;

const supp = atCommit("eslint-suppressions.json");
let suppressions = supp ? 0 : null;
if (supp)
    for (const rules of Object.values(supp))
        for (const r of Object.values(rules)) suppressions += r.count || 0;

// Coverage + mutation are not versioned per-commit; only harvest for HEAD.
const covTotal = fresh("coverage")
    ? readJSON("coverage/coverage-summary.json")?.total
    : null;
const coverage = covTotal
    ? {
          statements: covTotal.statements.pct,
          branches: covTotal.branches.pct,
          functions: covTotal.functions.pct,
          lines: covTotal.lines.pct,
      }
    : null;

const mut = fresh("mutation") ? readJSON("reports/mutation/mutation.json") : null;
let mutationScore = null;
if (mut?.files) {
    let killed = 0,
        survived = 0,
        noCov = 0;
    for (const f of Object.values(mut.files))
        for (const m of f.mutants) {
            if (m.status === "Killed") killed++;
            else if (m.status === "Survived") survived++;
            else if (m.status === "NoCoverage") noCov++;
        }
    const denom = killed + survived + noCov;
    if (denom) mutationScore = +((killed / denom) * 100).toFixed(2);
}

const results = fresh("tests") ? readJSON("reports/vitest/results.json") : null;
const tests =
    typeof results?.numTotalTests === "number" ? results.numTotalTests : null;

const row = { commit, ts, mutationScore, violations, coverage, suppressions, tests };

const histPath = path.join(root, "docs/pdd/history.jsonl");
fs.mkdirSync(path.dirname(histPath), { recursive: true });
let existing = [];
try {
    existing = fs
        .readFileSync(histPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
} catch {
    /* first run */
}
const rows = existing.filter((r) => r.commit !== commit);
rows.push(row);
rows.sort((a, b) => a.ts.localeCompare(b.ts));
fs.writeFileSync(histPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

const provenance = gates.size ? `gates:${[...gates].join(",")}` : "committed-only";
console.log("pdd snapshot", commit, `[${provenance}]`, JSON.stringify(row));
