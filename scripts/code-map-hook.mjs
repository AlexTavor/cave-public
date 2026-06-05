#!/usr/bin/env node
/**
 * PostToolUse hook backend for the Code Map (prevention layer — see
 * docs/methodology/code-map.md §6). Reads the hook payload on stdin; if the
 * edited file backs a map section, surfaces a non-blocking advisory so the
 * agent re-verifies and re-blesses that section before finishing.
 *
 * Wire in .claude/settings.json:
 *   { "hooks": { "PostToolUse": [
 *       { "matcher": "Edit|Write|MultiEdit",
 *         "hooks": [{ "type": "command", "command": "node scripts/code-map-hook.mjs" }] } ] } }
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
    let file;
    try {
        file = JSON.parse(input)?.tool_input?.file_path;
    } catch {
        process.exit(0); // not our payload — stay silent
    }
    if (!file) process.exit(0);

    let advisory = "";
    try {
        advisory = execFileSync(
            "node",
            [resolve(ROOT, "scripts/code-map.mjs"), "affected", file],
            { cwd: ROOT },
        )
            .toString()
            .trim();
    } catch {
        process.exit(0);
    }
    if (!advisory) process.exit(0);

    // Non-blocking: inject the advisory as additional context for the agent.
    console.log(
        JSON.stringify({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: advisory,
            },
        }),
    );
    process.exit(0);
});
