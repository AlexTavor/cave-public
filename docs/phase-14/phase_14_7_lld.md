Phase 14.7 — Semantic File Extensions & Full v1 Eradication

Low-Level Design (LLD) — Final

1. Purpose

This phase permanently removes all v1 logic from the system and formalizes semantic file extensions as the sole supported content ingestion mechanism.

This includes:

Elimination of all .json fragment ingestion paths

Removal of V1 fragment types and migration helpers

Removal of any v1-to-v2 conversion logic

Deterministic parsing based on semantic file extensions

Strict, schema-driven validation

Explicit merge contracts

Comprehensive test coverage

This document is authoritative and fully deterministic.

2. Why

v1 fragment envelopes:

Required envelope-based schema inference

Required migration shims

Prevented composable file-based overrides

Introduced ambiguous ingestion paths

Increased runtime complexity

Semantic extensions:

Encode intent at filesystem level

Eliminate envelope inference

Enable deterministic cascade merging

Remove all v1 logic and migration debt

Simplify the linker architecture

This phase finalizes the architectural direction.

3. Scope

This phase modifies:

Linker ingestion logic

Module loading

Manifest cascade merge

Terminal highlighting

Removal of all v1 logic across the repository

This phase does NOT:

Change runtime engine logic

Modify simulation rules

Introduce new gameplay features

4. Full v1 Deprecation (System-Wide)

The following MUST be removed entirely:

4.1 Types

V1Fragment

Any v1 envelope schema types

Any v1-specific parsing logic

4.2 Migration Utilities

migrateDisplay

migratePhysics

Entire v1tov2 module (delete directory)

Any import referencing v1 migration

4.3 Ingestion

.json fragment parsing logic

Any envelope-type switching

Any fragment.type inference

4.4 Runtime Assumptions

Any code expecting envelope-based fragments

Any compatibility fallback logic

4.5 Deterministic Enforcement

If any .json file is encountered during linking:

It SHALL be ignored.

A warning SHALL be emitted:

[Linker] Ignored unsupported file type: <path>

No attempt SHALL be made to parse it as fragment.

No silent fallback allowed.

5. Semantic File Extensions
   Extension Schema Merge Strategy
   .cave SysConfig Deep merge
   .draft DraftDefinition Deep merge
   .art ArtDefinition Deep merge
   .bp BlueprintV2 Registry merge (replace per ID)
   .cvs Plain text Not linked

No other extensions are recognized.

Unknown extensions:

Ignored

Emit warning

6. Linker Architecture
   6.1 ModuleLinker

Responsibility:
Ingest manifest files and construct final linked module.

Interface:

link(manifest: Manifest): LinkedModule

Behavior:

Resolve cascade order (base → override)

For each file:

Read file

Validate JSON

Parse by extension

Validate schema

Apply merge strategy

Return deterministic final module

6.2 Parsing Contract
6.2.1 JSON Parse

If JSON.parse fails:

Throw LinkerParseError

Abort linking

No silent recovery.

6.2.2 Schema Validation

All schema validation SHALL use Zod (or project-standard validator).

If validation fails:

Throw LinkerValidationError

Include path + validation message

Abort linking

No partial merge allowed.

7. Merge Semantics (Deterministic)
   7.1 Deep Merge

Used for:

SysConfig

DraftDefinition

ArtDefinition

Rules:

Objects: recursive merge

Arrays: REPLACE (never concatenate)

Primitives: override

null overwrites value

undefined ignored

Function:

deepMergeObjects(base: object, override: object): object

7.2 Registry Merge (Blueprints)

Used for .bp

Rules:

Namespace ID if not fully-qualified

Registry is object keyed by ID

If ID exists → full replacement

No partial deep merge of blueprint internals

Function:

mergeRegistry(base: Registry, override: Registry): Registry

8. Namespacing Rules

If ID does NOT contain :::

<filePathWithoutExtension>::<id>

If ID contains :::

Treated as fully-qualified

No prefix added

If collision after namespacing:

Override wins

Emit debug log (not warning)

9. File Responsibilities
   9.1 moduleLinker.ts

Orchestrates parsing and merge

No schema definitions inside

9.2 semanticParser.ts

Map extension → schema parser

No merge logic

9.3 deepMerge.ts

Pure functions only

No IO

9.4 registryMerge.ts

Blueprint-specific registry replacement

9.5 syntaxHighlight.tsx

Pure formatting only

No business logic

Presentation layer only

Conforms to:

No business logic in .tsx

No side effects

No simulation state mutation

10. Terminal Highlighting

Highlight:

.cave

.draft

.art

.bp

.cvs

Regex-only matching.
Pure function.
No state mutation.

11. Error Handling (Fully Deterministic)
    Condition Behavior
    Invalid JSON Throw
    Schema failure Throw
    Unknown extension Warn + ignore
    .json file Warn + ignore
    Missing file Throw
    Duplicate ID in same file Throw
    Duplicate ID across cascade Override wins

No ambiguous cases remain.

12. Testing Plan (Complete)
    12.1 Unit Tests
    Deep Merge

Nested object merge

Array replacement

Null override

Undefined ignored

Deep nesting

Registry Merge

New ID added

Existing ID replaced

Namespaced ID preserved

Auto-namespacing

12.2 Negative Tests

Invalid JSON

Missing file

Invalid schema

Duplicate ID same file

Unsupported extension

All must assert thrown error or logged warning.

12.3 Integration Tests

Multi-level cascade

Override precedence

Blueprint replacement

Mixed file types

Full module linking

12.4 Legacy Rejection Tests

.json file ignored

v1 envelope rejected

No migration logic reachable

Ensure v1tov2 module not present

12.5 Coverage Requirement

100% coverage for:

deepMerge

registryMerge

semanticParser

≥ 95% coverage overall for linker module

Meets Testing Standards:

Happy path

Negative

Edge cases

13. Definition of Done

Phase complete ONLY if:

All v1 types removed

All migration helpers deleted

No .json ingestion remains

All tests passing

Coverage thresholds met

No TODOs remain

No ambiguous behaviors

No envelope logic in repo

CI green

14. Standards Compliance

✔ No business logic in .tsx
✔ No envelope-based inference
✔ Deterministic error handling
✔ No silent failures
✔ Clear interface boundaries
✔ No scope expansion beyond ingestion

Fully adheres to:

Architecture Law

Prompt Contract

Testing Standards
