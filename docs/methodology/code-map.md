# The Code Map

*A methodology for keeping codebase knowledge **verified** and **enforceably fresh** — so agents and humans stop
re-deriving (and re-erring) the same hard-won understanding.*

A **Code Map** is a curated, file-keyed set of verified behavioral models of a codebase's load-bearing subsystems,
whose freshness is enforced by a mechanism rather than asserted by a date. It is a **lockfile for understanding**:
when the code it describes changes, the map is forced to be re-verified before work proceeds.

This document is codebase-agnostic. The *machinery* and *procedures* below are portable; only the map *content* is
project-specific. (Reference implementation: this repository — see `docs/manuals/code_map.md` + `CLAUDE.md`.)

---

## 1. The problem

Agents (and people) reconstruct understanding from symbol names, greps, and schemas, then **infer runtime behavior**
instead of reading it. Names lie; schemas describe shape, not behavior. The result is *confident error*.

Ordinary documentation does not fix this, because its freshness is **asserted, not enforced**: a `last updated` date
relies on someone remembering to change it. Nothing updates it, detects its staleness, or stops anyone acting on it.
It rots silently while looking authoritative — and **a confidently-wrong map is worse than no map**, because it
manufactures false certainty.

So the goal is not "more docs." It is a small body of *verified* knowledge that **cannot silently go stale**.

---

## 2. Principles

1. **Verified, not asserted.** Every claim is backed by a real read and anchored to `file:line`. No claim without
   evidence. Treat the map like a test fixture, not prose.
2. **Curated, not exhaustive.** Map only *load-bearing*, *footgun-dense*, *high-confusion* subsystems — where being
   wrong is expensive. Coverage is deliberately partial and **accretes from real errors and real need**. A section
   earns its place; it is not created for completeness. Exhaustive documentation is the anti-pattern: it rots fastest
   and turns the gate into noise. *Document what misleads, keyed to where it lives.*
3. **File-keyed.** Each section declares the source files its claims depend on. The map's freshness is a pure
   function of those files' content.
4. **Enforced, not intended.** Freshness is gated by a content-hash check, not a timestamp. Drift becomes a **loud,
   blocking, auditable checkpoint** — review-by-default instead of rot-by-default.
5. **Corrected, not appended.** When a claim is found wrong, *overwrite* it. Never leave a stale claim beside a new
   one.
6. **Bless is auditable.** Re-verification is an explicit, diffable act carrying a one-line note (*what changed,
   still-correct or fixed*). Reviewable, never a rubber stamp.
7. **Coarse but robust.** Key on whole files by default. Precise (line/symbol) keys are brittle — every edit shifts
   them and fires false staleness, and **alert fatigue is how enforcement dies.** Accept false positives; never
   accept a false negative.

---

## 3. Artifacts

- **The map** — one or more documents of **sections**. Each section = a title, a set of verified claims (each with a
  `file:line` anchor), and the list of source files it depends on.
- **The manifest** — machine-readable: section → its files → each file's **blessed content hash** + the last bless
  note. This is what the gate reads.
- **(Optional) An always-loaded digest** — the highest-value footguns + the "read, don't infer" rule, placed where
  every session sees it (e.g. `CLAUDE.md`, agent system prompt, or onboarding memory). The full map is loaded on
  demand; the digest is the always-on tripwire.

---

## 4. Manifest schema

```jsonc
{
  "version": 1,
  "map": "docs/manuals/code_map.md",
  "exclude": ["**/*.generated.*", "vendor/**"],   // never tracked
  "sections": {
    "power-assignment": {
      "title": "Power pool & assignment",
      "files": [
        "src/game/systems/AttributePoolSystem.ts",
        "src/game/systems/poolContributors.ts",
        "src/game/systems/BodyAssignmentSystem.ts"
      ],
      "blessed": {                                  // git blob SHA at last verification
        "src/game/systems/AttributePoolSystem.ts": "a1b2c3…",
        "src/game/systems/poolContributors.ts":    "d4e5f6…",
        "src/game/systems/BodyAssignmentSystem.ts":"7890ab…"
      },
      "lastBless": {
        "commit": "…",
        "note": "Confirmed assignment is power-blind; pool does not exclude assigned bodies."
      }
    }
  }
}
```

The hash is the file's git blob SHA (`git hash-object <file>`) — deterministic, language-agnostic, and the same
identity git already tracks.

---

## 5. Lifecycle

- **Bootstrap.** Identify the load-bearing subsystems (§2). For each, *read the code* and write a section of verified
  claims with anchors; record its files and current blessed hashes in the manifest. (Independent re-verification —
  e.g. a fan-out of agents that each read and confirm/correct — is the strongest bootstrap; it catches the author's
  own errors before they are enshrined.)
- **Check (the gate).** For each section, for each file: if the file is missing → **STALE** (moved/deleted, must be
  re-pointed); if `git hash-object <file>` ≠ the blessed hash → **STALE**. Exit non-zero listing the stale sections
  and which files moved them.
- **Re-bless.** For a stale section: read the changed files, reconcile the section with reality (fix it if wrong),
  then write the current hashes into `blessed` and add a `lastBless.note`. Blessing without reading is the one move
  the methodology forbids — and the note + diff are what make a lazy bless visible.
- **Grow / retire.** A new load-bearing subsystem earns a new section + manifest entry. A subsystem that's deleted or
  no longer load-bearing has its section retired. The map tracks the codebase's *risk surface*, not its size.

---

## 6. Enforcement layers

Layer the gate, and be explicit about which layer is *enforcement* vs *signal*:

| Layer | When | Strength |
| --- | --- | --- |
| **pre-push hook** | local, before push | fast **signal** — bypassable (`--no-verify`) |
| **CI on PR** | on every PR | **canonical enforcement** — cannot be skipped, blocks merge |
| **agent-edit hook** | the moment an agent edits a tracked file | **prevention** — catches drift at its source, before a PR exists |

CI-on-PR is the gate that actually holds; the other two are early signals. In an AI-driven repo the agent-edit hook
is high-leverage: it injects *"you changed `X`, which backs map §N — re-verify §N before finishing"* into the agent's
own loop, so drift is caught by the thing causing it.

---

## 7. In an AI-built codebase

The map is built and maintained **by agents**, so fold it into the definition of done:

- The agent that changes a tracked file **re-blesses** the affected section (read → reconcile → bless with note) as
  part of the same change. "Map green" is a merge requirement, like "tests green."
- The bless note + the diff are reviewed (by a human or a reviewer-agent) exactly as code is.
- A standing rule lives in the always-loaded digest: *for load-bearing claims about runtime behavior, read the
  system; do not infer from names or greps.*

This makes accuracy a build invariant rather than a hope — and a *named, enforceable method for keeping AI accurate
on a large codebase* is itself a transferable asset.

---

## 8. The honest limit

No gate can force a re-review to be **correct** — only to **happen** (or to be explicitly, auditably blessed). The
methodology converts *silent drift* into a *blocking checkpoint*; it does not guarantee diligence. The residual risk
(a lazy bless) is contained by three things: small sections (re-review is cheap), the mandatory bless note
(reviewable), and the bless landing in the diff next to the code change (a blind bless beside a real edit is a visible
red flag). That is the realistic ceiling — and it is far above rot-by-default.

---

## 9. Anti-patterns (forbidden)

- **Timestamp freshness** ("last verified: <date>") with no mechanism behind it.
- **Exhaustive coverage** — mapping the whole codebase instead of its risk surface.
- **Inferring behavior** from names, types, or grep hits instead of reading.
- **Line/symbol-level keys** adopted before file-level proves too coarse (brittleness → alert fatigue).
- **Blessing without reading** — updating hashes to make the gate pass without re-verifying.
- **Appending corrections** beside stale claims instead of overwriting them.

---

## 10. Adoption

**Generic (the portable kit):** manifest schema (§4), the `check`/`bless` contract (§5), CI + hook templates (§6),
and the two agent procedures — `bootstrap` (discover → read → emit sections + manifest) and `rebless`
(read changed files → reconcile → bless with note).

**Project-specific (supplied per repo):** the curation policy (what earns a section), the section content, and the
file lists.

**To adopt in a new repo:** drop in the kit → run `bootstrap` over the agreed load-bearing subsystems → wire the
CI check → add the always-loaded digest + read-don't-infer rule. The map then maintains itself under the gate.
