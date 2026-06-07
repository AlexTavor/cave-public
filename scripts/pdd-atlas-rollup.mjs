#!/usr/bin/env node
// pdd-atlas-rollup.mjs — derive MAP burn-down counts from docs/pdd/atlas/atlas.json
// and append one trend row to docs/pdd/atlas-history.jsonl.
//
// Counts are DERIVED here, never hand-typed, so the dashboard cannot drift from the
// inventory. Re-running on an unchanged atlas (same base_commit + same counts) is a no-op,
// so this is safe to wire into a future `atlas:check` or CI step. One row per atlas run.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const atlasPath = path.join(root, "docs/pdd/atlas/atlas.json");
const feedPath = path.join(root, "docs/pdd/atlas-history.jsonl");

const atlas = JSON.parse(fs.readFileSync(atlasPath, "utf8"));
const F = atlas.findings ?? [];
const count = (kind, pred = () => true) =>
    F.filter((f) => f.kind === kind && pred(f)).length;

const counts = {
    openRisksHigh: count(
        "risk",
        (f) => f.status === "open" && f.severity === "high",
    ),
    openRisksTotal: count("risk", (f) => f.status === "open"),
    footgunsOpen: count("footgun", (f) => f.status === "open"),
    silentFailuresReal: count(
        "silent-failure",
        (f) => f.status === "open" && f.classification === "real",
    ),
    coverageGaps: count("coverage-gap", (f) => f.status === "open"),
};

const base = atlas.base_commit ?? "";
const row = { ts: new Date().toISOString(), commit: base.slice(0, 7), base_commit: base, ...counts };

const existing = fs.existsSync(feedPath)
    ? fs
          .readFileSync(feedPath, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l))
    : [];

const COUNT_KEYS = Object.keys(counts);
const last = existing[existing.length - 1];
const unchanged =
    last &&
    last.base_commit === row.base_commit &&
    COUNT_KEYS.every((k) => last[k] === row[k]);

if (unchanged) {
    console.log("atlas-rollup: unchanged since last row — no-op");
} else {
    fs.appendFileSync(feedPath, JSON.stringify(row) + "\n");
    console.log("atlas-rollup: appended row", JSON.stringify(counts));
}
