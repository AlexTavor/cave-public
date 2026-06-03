#!/usr/bin/env node
/**
 * Code Map freshness gate. See docs/methodology/code-map.md.
 *
 * Each map section (docs/manuals/code_map.md) declares the source files its
 * claims depend on. We record each file's git blob SHA at last verification
 * ("bless"). A section is STALE when any of its files changed (or moved) since.
 *
 *   node scripts/code-map.mjs check                 # gate: exit 1 if any section stale
 *   node scripts/code-map.mjs bless <section> --note "…"   # re-verify + record hashes
 *   node scripts/code-map.mjs bless --all --bootstrap      # initial population
 *   node scripts/code-map.mjs affected <file>       # which sections a file backs (advisory)
 *
 * Dependency-free: Node built-ins + `git hash-object` only.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = resolve(ROOT, "docs/manuals/code_map.manifest.json");

const rel = (p) => relative(ROOT, p);
const die = (msg) => {
    console.error(`code-map: ${msg}`);
    process.exit(2);
};

const readManifest = () => {
    if (!existsSync(MANIFEST)) die(`manifest not found: ${rel(MANIFEST)}`);
    return JSON.parse(readFileSync(MANIFEST, "utf8"));
};
const writeManifest = (m) =>
    writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");

const blobSha = (file) => {
    try {
        return execFileSync("git", ["hash-object", "--", file], { cwd: ROOT })
            .toString()
            .trim();
    } catch {
        return null; // missing / unreadable
    }
};
const headSha = () => {
    try {
        return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT })
            .toString()
            .trim();
    } catch {
        return null;
    }
};

const evalSection = (key, section) => {
    const blessed = section.blessed ?? {};
    const files = section.files.map((file) => {
        const current = blobSha(file);
        let status;
        if (current === null) status = "missing";
        else if (blessed[file] === undefined) status = "unblessed";
        else if (blessed[file] !== current) status = "changed";
        else status = "ok";
        return { file, status };
    });
    return { key, title: section.title, files, stale: files.some((f) => f.status !== "ok") };
};

const cmdCheck = (args) => {
    const m = readManifest();
    const results = Object.entries(m.sections).map(([k, s]) => evalSection(k, s));
    const stale = results.filter((r) => r.stale);
    if (args.includes("--json")) {
        console.log(JSON.stringify({ ok: stale.length === 0, sections: results }, null, 2));
    } else {
        for (const r of results) {
            if (!r.stale) {
                console.log(`  ok    §${r.key}  ${r.title}`);
                continue;
            }
            console.log(`  STALE §${r.key}  ${r.title}`);
            for (const f of r.files.filter((f) => f.status !== "ok"))
                console.log(`          ${f.status.padEnd(9)} ${f.file}`);
        }
        console.log("");
        console.log(
            stale.length === 0
                ? `code-map: all ${results.length} sections fresh ✓`
                : `code-map: ${stale.length}/${results.length} section(s) STALE — re-verify them in docs/manuals/code_map.md, then:\n  npm run code-map:bless -- <section> --note "what changed / still correct"`,
        );
    }
    process.exit(stale.length === 0 ? 0 : 1);
};

const cmdBless = (args) => {
    const m = readManifest();
    const all = args.includes("--all");
    const bootstrap = args.includes("--bootstrap");
    const noteIdx = args.indexOf("--note");
    const note = noteIdx >= 0 ? args[noteIdx + 1] : null;

    const positionals = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--note") {
            i++;
            continue;
        }
        if (!args[i].startsWith("--")) positionals.push(args[i]);
    }
    const keys = all ? Object.keys(m.sections) : positionals;
    if (keys.length === 0) die("bless: name a section, or pass --all");
    if (!note && !bootstrap)
        die('bless: a note is required — pass --note "what changed / still correct" (use --bootstrap only for initial population)');

    const missing = [];
    for (const key of keys) {
        const section = m.sections[key];
        if (!section) die(`bless: unknown section '${key}'`);
        const blessed = {};
        for (const file of section.files) {
            const sha = blobSha(file);
            if (sha === null) missing.push(`${key}: ${file}`);
            else blessed[file] = sha;
        }
        section.blessed = blessed;
        section.lastBless = {
            commit: headSha(),
            note: note ?? "bootstrap: initial verification against working tree",
        };
    }
    if (missing.length)
        die(`bless: ${missing.length} file(s) not found — fix the manifest paths:\n  ${missing.join("\n  ")}`);
    writeManifest(m);
    console.log(`code-map: blessed ${keys.length} section(s): ${keys.join(", ")}`);
};

const cmdAffected = (args) => {
    const file = args.find((a) => !a.startsWith("--"));
    if (!file) process.exit(0);
    const norm = rel(resolve(ROOT, file));
    const m = readManifest();
    const hits = Object.entries(m.sections)
        .filter(([, s]) => s.files.includes(norm))
        .map(([k, s]) => `  §${k}  ${s.title}`);
    if (hits.length === 0) process.exit(0);
    console.log(
        `code-map: ${norm} backs ${hits.length} map section(s) — re-read and reconcile docs/manuals/code_map.md, then bless:\n${hits.join("\n")}`,
    );
    process.exit(0); // advisory — never blocks the edit
};

const [cmd, ...rest] = process.argv.slice(2);
const handlers = { check: cmdCheck, bless: cmdBless, affected: cmdAffected };
(handlers[cmd] ?? (() => die(`unknown command '${cmd ?? ""}'. use: check | bless | affected`)))(rest);
