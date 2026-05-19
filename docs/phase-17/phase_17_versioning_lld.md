# LLD — Project Versioning, New Game Confirmation, and Swarm Avatar Motion

## 0. Scope

This document defines the low-level design for the following changes:

1. Handle `vfs-prod.json` versioning:
    - load the project from `vfs-prod.json` when the bootstrap snapshot project version is newer than the in-memory VFS project version
    - add semantic versioning to `manifest.json`
    - automatically update the project semantic version when the project changes are saved
    - classify a change inside a project file (`.bp`, `.art`, `.cave`, `.draft`, `.cvs`, or module JSON saved through the existing module save flow) as a **patch** update
    - classify adding a new file to `manifest.files` as a **minor** update

2. Only show the “Are you sure” new game dialog when an `autosave` slot exists
3. Make swarm avatars shuffle around the radius of the swarm node

This design is constrained by the uploaded project contract and testing standards. It stays inside the existing architecture, keeps UI logic thin, and reuses current VFS, workspace, save, and Phaser display mechanisms rather than introducing a parallel persistence path.

---

## 1. Grounded observations from the current codebase

### 1.1 Project manifest and workspace loading

Current `ProjectManifest` contains only `name` and `files`. `WorkspaceService.createProject()` writes `{ name, files: [] }`, and `WorkspaceService.loadProject()` reads the manifest, validates the listed files, links the project, and recreates the runtime. There is no project-level version field today.

### 1.2 Bootstrap behavior

`useAppBootstrap()` currently does this sequence:

1. `vfs.init()`
2. `resolveWorkspaceManifestPath()`
3. if a manifest already exists in VFS, stop and use it
4. otherwise fetch `/bootstrap/vfs-prod.json`, import it into VFS, refresh the file cache, and resolve the manifest again

This means an older in-memory VFS project always wins over `vfs-prod.json` today because the bootstrap snapshot is not consulted once any manifest already exists.

### 1.3 Existing semantic version utilities

The codebase already has:

- `src/engine/vfs/version.ts` with `isSemverNewer(v1, v2)`
- `src/ui/devtools/utils/versionUtils.ts` with a patch-only `bumpVersion()`
- module-level version bumping in `src/ui/devtools/utils/modulePersistence.ts`

These are useful, but they do not currently version the project manifest.

### 1.4 Save paths are not uniform

There are three distinct persistence patterns today:

1. `moduleStore.io.saveModule()` writes a module file and syncs it to disk immediately
2. `useManifestDraft()` writes manifest edits into VFS immediately, but not to disk
3. `RawJsonEditor` writes directly into VFS on a debounce, but not to disk
4. the global toolbar save flushes project save handlers and then calls `vfs.saveToDisk()` for every exportable VFS file

Because of this, project versioning cannot be tied to only one editor or only one save button.

### 1.5 New game confirmation behavior

`useAppShellController()` always opens the `new-game` overlay when the NEW GAME action is selected. The dialog text explicitly warns about overwriting autosave. The runtime save list is already fetched while the main menu and new-game overlay are open.

### 1.6 Swarm avatar rendering behavior

`SwarmAvatarModule` renders one avatar slot per `swarm.count` and calls `resolveSwarmAvatarPlacement(radius, count, index)`. The layout function is currently deterministic and static for a given radius/count/index tuple. The visuals do not move after they are placed.

---

## 2. Design goals

### 2.1 Why this change is needed

#### Project versioning

The bootstrap snapshot is the shipped project state. The in-memory VFS is the locally retained project state. Without a project-level manifest version, the bootstrap logic cannot decide which state is authoritative. That creates stale-local-state behavior.

#### New game confirmation

The warning only makes sense when an `autosave` actually exists. Showing it when there is no autosave adds friction without protecting any data.

#### Swarm avatar motion

The swarm node already aggregates multiple entities visually. Static avatar placement makes the node feel inert. A deterministic shuffle inside the existing radius preserves readability while making the swarm feel alive.

### 2.2 Non-goals

This design does not:

- introduce major-version semantics
- change runtime mutation rules
- change save slot semantics
- refactor the editor save architecture beyond what is required to version the project correctly
- change how swarm membership is computed
- change avatar appearance generation

---

## 3. Shared versioning contract

This section is the authoritative contract for all project-versioning work.

### 3.1 Manifest schema contract

`manifest.json` becomes:

- `name: string`
- `version: string`
- `files: string[]`

### 3.2 Version format contract

- The format is strict semantic versioning with exactly three numeric segments: `MAJOR.MINOR.PATCH`
- New manifests start at `0.0.1`
- There is no major bump path in this work

### 3.3 Backward-compatibility contract

Existing manifests may not have a `version` field.

The loader behavior must be:

- missing `version` on read → normalize to `0.0.0`
- present but malformed `version` → fail loudly with an explicit manifest error

This preserves compatibility with existing saved projects while preventing undefined ordering rules going forward.

### 3.4 Change classification contract

The implementation must classify project changes as follows:

- **patch**
    - any saved content change inside an existing manifest-listed project file
    - any manifest mutation that is not a file addition, including `name` changes, file removal, or file reorder

- **minor**
    - one or more newly added entries in `manifest.files`

### 3.5 Single-save-cycle contract

A project save cycle is the span between a clean manifest version state and the next successful persistence of the project versioned manifest to disk.

Within one save cycle:

- many patch-classified edits still produce exactly one patch bump
- any minor-classified edit upgrades the pending cycle bump to minor
- patch after minor does not increase the version again

Examples:

- `0.4.2` + one `.bp` save → `0.4.3`
- `0.4.2` + five `.bp` saves before final disk flush → still `0.4.3`
- `0.4.2` + patch edits + one new manifest file addition before final disk flush → `0.5.0`

### 3.6 In-memory vs disk contract

The manifest version in VFS memory must be updated as soon as a new pending project version is established.

Reason:

The bootstrap decision compares the bootstrap snapshot version to the VFS in-memory version. If the in-memory version stays stale until a later disk flush, the app can incorrectly import an older local project or overwrite a newer local project.

### 3.7 Failure contract

There is no existing transactional multi-file VFS write API. Therefore:

- all version-application failures must surface explicit errors
- a failed version application must not clear the staged pending version state
- a successful disk save clears the staged pending version state for that manifest

No silent downgrade to unversioned saves is allowed.

---

## 4. Detailed design — `vfs-prod.json` versioning and manifest versioning

## 4.1 High-level behavior

### What changes

At bootstrap, the app will always inspect the bootstrap snapshot manifest version when the snapshot exists.

The decision becomes:

1. resolve the current in-memory manifest path
2. resolve the bootstrap snapshot manifest path from the snapshot keys
3. read both manifests through the same manifest parser
4. import the bootstrap snapshot only when the snapshot manifest version is newer than the in-memory manifest version
5. otherwise keep the current VFS contents

### How project versioning works end-to-end

1. editors and save flows classify project changes as `patch` or `minor`
2. the project version tracker records the highest pending change for the active manifest path
3. when the pending change raises the effective version, the manifest stored in VFS is rewritten immediately with the derived version
4. when the project is saved to disk successfully, the tracker is cleared for that manifest path

This reuses the existing manifest file as the single source of truth and reuses the existing `vfs.saveToDisk()` and bootstrap import/export flows.

---

## 4.2 Files to add

### `src/engine/workspace/projectVersionTracker.ts` — **new**

**Responsibility**

Track the staged project version bump for each manifest path across a save cycle.

**Logic**

For each `manifestPath`, store:

- `baseVersion`: the manifest version before the current save cycle started
- `pendingChange`: `patch` or `minor`
- `effectiveVersion`: `bump(baseVersion, pendingChange)`

Rules:

- first staged change for a manifest starts a save cycle
- subsequent `patch` after `patch` does nothing
- subsequent `minor` after `patch` upgrades the cycle to `minor`
- subsequent `patch` after `minor` does nothing
- clearing the tracker ends the cycle

**Interface**

This file must export these pure/public operations:

- `stageProjectVersion(manifestPath, currentManifestVersion, changeKind)`
    - returns the effective version that must be present in VFS now
    - indicates whether the manifest version changed in this call

- `getStagedProjectVersion(manifestPath)`
    - returns the current staged state or `null`

- `clearStagedProjectVersion(manifestPath)`
    - ends the current save cycle for that manifest

This file must not know anything about VFS, UI, or disk persistence.

### `src/engine/workspace/projectVersionTracker.test.ts` — **new**

**Responsibility**

Unit-test the save-cycle state machine.

**Required test cases**

- first patch stages one patch bump
- repeated patch does not increment again
- minor upgrades an existing patch cycle to minor
- patch does not downgrade an existing minor cycle
- clearing resets the cycle

---

## 4.3 Files to change

### `src/engine/workspace/projectManifest.ts`

**Responsibility after change**

Remain the canonical manifest parser/validator, and become the canonical place for project manifest version rules.

**Logic after change**

Add:

- `version` to `ProjectManifest`
- manifest version normalization and validation
- manifest creation helper for new manifests
- manifest change classification helper
- version bump helper for `patch` and `minor`

Required rules:

- `parseProjectManifest()` returns `version: "0.0.0"` when the field is missing
- `parseProjectManifest()` throws when `version` is present but not a strict `x.y.z` string
- `createProjectManifest(name)` returns `{ name, version: "0.0.1", files: [] }`
- `classifyManifestChange(previous, next)` returns:
    - `minor` when `next.files` contains at least one new entry not present in `previous.files`
    - `patch` when the manifest changed but no new file was added
    - `null` when there is no effective change

- `bumpProjectVersion(version, "patch")` performs `X.Y.Z -> X.Y.(Z+1)`
- `bumpProjectVersion(version, "minor")` performs `X.Y.Z -> X.(Y+1).0`

**Interface after change**

This file must export:

- updated `ProjectManifest`
- `parseProjectManifest()`
- `readProjectManifest()`
- `createProjectManifest(name)`
- `classifyManifestChange(previous, next)`
- `bumpProjectVersion(version, changeKind)`

### `src/engine/workspace/projectManifest.test.ts`

**Responsibility after change**

Unit-test manifest schema and change classification.

**Required test cases**

- versionless manifest normalizes to `0.0.0`
- malformed present version throws
- new manifest helper starts at `0.0.1`
- file addition classifies as `minor`
- name change classifies as `patch`
- reorder/removal classifies as `patch`
- unchanged manifest classifies as `null`

### `src/app-shell/resolveWorkspaceManifestPath.ts`

**Responsibility after change**

Continue resolving the active project manifest path from VFS, and expose a pure path-selection helper reusable by bootstrap snapshot inspection.

**Logic after change**

Extract the current selection rule into a pure helper that accepts a string list:

- prefer `manifest.json`
- otherwise prefer the first nested `*/manifest.json`
- otherwise return `null`

`resolveWorkspaceManifestPath()` remains the VFS-backed wrapper.

**Interface after change**

This file must export:

- `resolveManifestPathFromPaths(paths: string[]): string | null`
- existing `resolveWorkspaceManifestPath()`

### `src/app-shell/useAppBootstrap.ts`

**Responsibility after change**

Bootstrap the app from the newest available project state.

**Logic after change**

The effect flow becomes:

1. `await vfs.init()`
2. resolve current VFS manifest path
3. try to fetch `vfs-prod.json`
4. if the snapshot fetch fails and a current VFS manifest exists, keep the current VFS manifest and surface no bootstrap error
5. if the snapshot fetch fails and no current manifest exists, surface the existing bootstrap error
6. if the snapshot fetch succeeds:
    - resolve snapshot manifest path from `Object.keys(snapshot)`
    - if current manifest is absent and snapshot manifest exists, import snapshot
    - if both manifests exist, parse both and compare `snapshot.version` vs `current.version`
    - import snapshot only when `isSemverNewer(snapshot.version, current.version)` is true
    - otherwise keep the current VFS contents

7. after any import, refresh the file cache and resolve the manifest path again
8. populate `workspaceManifestPath` from the manifest that actually won

Required behavior:

- equality keeps VFS memory
- older snapshot keeps VFS memory
- newer snapshot imports and wins
- snapshot import is still all-or-nothing through existing `vfs.importState()`

**Interface after change**

No public interface change.

### `src/app-shell/useAppBootstrap.test.tsx`

**Responsibility after change**

Cover bootstrap version-selection behavior.

**Required test cases**

- no current manifest + valid snapshot manifest → import snapshot
- current manifest older than snapshot manifest → import snapshot
- current manifest newer than snapshot manifest → do not import snapshot
- equal versions → do not import snapshot
- snapshot fetch failure with current manifest present → continue with current manifest
- snapshot with malformed manifest version → explicit bootstrap error

### `src/ui/devtools/state/moduleStore.io.ts`

**Responsibility after change**

Continue to be the canonical editor module persistence boundary, and participate in project version staging for direct module saves.

**Logic after change**

After a module file save succeeds:

1. identify the active manifest path from the existing workspace service
2. if there is no active manifest, do nothing extra
3. if the saved file is not listed in that manifest, do nothing extra
4. classify the change as `patch`
5. stage the manifest version through `projectVersionTracker`
6. if staging raises the effective manifest version, rewrite the manifest in VFS immediately
7. because this save path already syncs the module to disk immediately, also persist the manifest file to disk in the same save operation
8. only after both writes succeed, clear the staged project version for that manifest

This file must preserve current semantic module save behavior:

- semantic files still save through `saveSemanticModule()`/raw payload
- non-semantic module JSON still saves through `saveModuleWithVersionBump()`

Project versioning is additional behavior, not a replacement.

**Interface after change**

No public interface change.

### `src/ui/devtools/state/moduleStore.io.test.ts`

**Responsibility after change**

Prove that direct module saves stage and persist one project patch bump.

**Required test cases**

- saving a manifest-listed project file bumps project manifest patch once
- repeated save within the same clean cycle does not double-bump before clear
- saving a file not in the active manifest does not touch project version
- semantic save path and non-semantic save path both apply the same project patch rule

### `src/ui/devtools/editors/manifest/useManifestDraft.ts`

**Responsibility after change**

Continue to manage manifest editor draft state, and become the manifest-change classifier for manifest editor operations.

**Logic after change**

On every `updateDraft(transform, shouldRecord)` call:

1. compute `next = transform(draft)`
2. classify the manifest change with `classifyManifestChange(draft, next)`
3. if there is no effective change, do not rewrite version
4. if there is a classified change:
    - stage the project version for `filename`
    - if staging raises the effective version, set `next.version` to the staged effective version before writing to VFS

5. write the updated manifest to VFS
6. keep the current project-save handler behavior

Important:

- this file updates VFS immediately
- this file does **not** clear the staged version; the staged version is cleared only after a successful disk save

**Interface after change**

No public interface change.

### `src/ui/devtools/editors/manifest/useManifestDraft.test.ts`

**Responsibility after change**

Prove manifest edit classification and version staging.

**Required test cases**

- adding a file stages and writes a minor version bump
- renaming the project stages and writes a patch version bump
- repeated patch edits in the same cycle do not keep incrementing the version
- patch followed by file addition upgrades the staged version from patch to minor

### `src/ui/devtools/editors/manifest/RawJsonEditor.tsx`

**Responsibility after change**

Continue to be the generic raw JSON editor, but correctly participate in project version staging when it edits project-owned files.

**Logic after change**

Before the debounced VFS write executes, determine the target type:

- if target is the active manifest file:
    - parse the previous manifest object and the next manifest object
    - classify the manifest change
    - stage the resulting change and rewrite `version` in the payload when needed

- else if target is a manifest-listed project file:
    - stage a `patch` change for the active manifest
    - if staging raises the effective manifest version, rewrite the manifest in VFS immediately before or alongside writing the target file

- else:
    - preserve current raw write behavior

This file must not introduce business logic into JSX. The classification and staging calls must remain in the handler logic only.

**Interface after change**

No public interface change.

### `src/ui/devtools/editors/manifest/RawJsonEditor.test.tsx`

**Responsibility after change**

Verify project version staging for raw-editor saves.

**Required test cases**

- editing a manifest-listed project file stages one patch bump in the manifest
- editing the manifest to add a file stages a minor bump
- invalid JSON still does not write or stage anything

### `src/ui/devtools/shell/useGlobalEditorToolbarActions.ts`

**Responsibility after change**

Remain the global project save/compile/export coordinator, and become the place that clears staged project version state after a successful full project disk save.

**Logic after change**

`handleSave()` becomes:

1. save the current active module if present (existing behavior)
2. run project save handlers (existing behavior)
3. persist every exportable VFS file to disk (existing behavior)
4. if all required manifest disk writes succeed for the active manifest, clear the staged project version for that manifest
5. if persistence fails, do not clear the staged project version

This file does not compute the next version. It only finalizes the save cycle.

**Interface after change**

No public interface change.

### `src/engine/terminal/commands/projectSaveCommand.ts`

**Responsibility after change**

Keep blueprint validation/save behavior, and apply a single project patch bump for this terminal save path.

**Logic after change**

After `workspaceService.writeModule()` succeeds for the validated blueprint payload:

1. read the active manifest
2. stage a `patch` version change for that manifest
3. rewrite the manifest in VFS if staging raises the effective version
4. persist the manifest to disk if this command path persists immediately
5. clear the staged version only on success

Because this command saves one blueprint payload, the version effect is exactly one patch bump for the save cycle.

**Interface after change**

No CLI interface change.

### `src/engine/workspace/RefactorService.ts`

**Responsibility after change**

Keep namespace move/refactor behavior, and apply one project patch bump after the refactor batch completes.

**Logic after change**

After the command finishes all of these existing operations:

- move files
- rewrite module references
- rewrite `manifest.files`
- reload the workspace

it must:

1. stage a single `patch` change for the manifest
2. rewrite the manifest version once from the tracker’s effective version
3. persist/clear according to the save semantics of this command path

This command must not bump once per rewritten file.

**Interface after change**

No public interface change.

### `src/engine/workspace/RefactorService.test.ts`

**Responsibility after change**

Verify that a refactor batch produces one project patch bump, not one bump per changed file.

### `src/engine/workspace/WorkspaceService.ts`

**Responsibility after change**

Continue to own workspace load/create state.

**Logic after change**

`createProject()` must use the canonical `createProjectManifest(name)` helper so every newly created project starts versioned at `0.0.1`.

No other behavioral change is required here.

**Interface after change**

No public interface change.

### `src/engine/workspace/WorkspaceService.test.ts`

**Responsibility after change**

Verify that newly created projects start with a versioned manifest.

### `src/engine/terminal/commands/makeCommands.ts`

**Responsibility after change**

Keep terminal file template creation behavior.

**Logic after change**

The manifest template returned for `manifest.json` must include `version: "0.0.1"` through the canonical manifest helper.

**Interface after change**

No CLI interface change.

### `src/ui/devtools/project/newFileTemplates.ts`

**Responsibility after change**

Keep project explorer file template behavior.

**Logic after change**

The manifest template returned for `manifest.json` must include `version: "0.0.1"` through the canonical manifest helper.

**Interface after change**

No public interface change.

---

## 4.4 Bootstrap comparison algorithm

Pseudocode contract only:

1. `currentManifestPath = resolveWorkspaceManifestPath()`
2. `snapshot = try loadBootstrapSnapshotFromPublicAsset()`
3. `snapshotManifestPath = resolveManifestPathFromPaths(Object.keys(snapshot))`
4. Decision:
    - no current, yes snapshot → import snapshot
    - yes current, no snapshot → keep current
    - yes current, yes snapshot:
        - `current = parseProjectManifest(vfs.readFile(currentManifestPath), currentManifestPath)`
        - `incoming = parseProjectManifest(snapshot[snapshotManifestPath], snapshotManifestPath)`
        - if `isSemverNewer(incoming.version, current.version)` → import snapshot
        - else keep current

5. resolve the winning manifest path and publish it to app state

---

## 4.5 Error handling

- malformed manifest version in VFS → bootstrap/load fails explicitly
- malformed manifest version in snapshot → bootstrap fails explicitly when no valid current manifest exists; otherwise keep current manifest and surface the snapshot parse failure as bootstrap error text
- manifest rewrite failure during version staging → surface explicit save error, do not clear staged tracker state
- disk save failure after staged version exists → surface explicit save error, do not clear staged tracker state

---

## 4.6 Acceptance criteria

- `manifest.json` is versioned everywhere new manifests are created
- VFS-memory manifest version always reflects the newest staged project change level
- `vfs-prod.json` only replaces VFS when its manifest version is newer
- one save cycle yields one project version bump at the highest change level seen in that cycle
- direct module saves and toolbar saves both preserve the contract

---

## 5. Detailed design — show new-game confirmation only when autosave exists

## 5.1 High-level behavior

### Why

The dialog protects against overwriting autosave. Without an `autosave` slot, the dialog does not protect anything.

### What changes

Selecting NEW GAME will:

- open the confirmation dialog only when `availableSaves` contains `"autosave"`
- otherwise execute the existing new game flow immediately

### How

Reuse the already-fetched save list in `useAppShellController()`. Do not add a new async fetch. Do not add state to React components.

---

## 5.2 Files to change

### `src/app-shell/appShellControllerHelpers.ts`

**Responsibility after change**

Continue to hold small shell decision helpers.

**Logic after change**

Add a helper:

- `hasAutosave(availableSaves: string[]): boolean`

It returns true only when the literal slot name `autosave` is present.

**Interface after change**

Export `hasAutosave()` alongside the existing helpers.

### `src/app-shell/useAppShellController.ts`

**Responsibility after change**

Remain the main-menu action coordinator.

**Logic after change**

Replace the unconditional NEW GAME action callback with:

- if `hasAutosave(runtime.availableSaves)` → `shell.openNewGameMenu()`
- else → call the existing `handleNewGame()` path directly

Required behavior:

- no overlay state transition to `new-game` when there is no autosave
- direct path must still clear errors, load the workspace manifest, start the gameplay session, and open the main-menu cinematic exactly as the existing confirm path does

**Interface after change**

No public interface change.

### `src/app-shell/useAppShellController.test.tsx`

**Responsibility after change**

Cover both NEW GAME branches.

**Required test cases**

- autosave present → selecting NEW GAME opens the `new-game` overlay
- autosave absent → selecting NEW GAME directly loads the project and opens the cinematic without showing the confirmation overlay

### `src/app-shell/useAppShellController.cinematic.test.tsx`

**Responsibility after change**

Protect the no-autosave cinematic path.

**Required test case**

- with no autosave, selecting NEW GAME reaches the same cinematic state as confirming through the dialog

---

## 5.3 Acceptance criteria

- the confirmation overlay appears only when `autosave` exists
- the no-autosave path still runs the identical new-game runtime/bootstrap flow
- there is no extra network or VFS read added for this feature

---

## 6. Detailed design — swarm avatars shuffle around the swarm radius

## 6.1 High-level behavior

### Why

The swarm node represents many bodies. Static placement does not communicate that aggregated activity.

### What changes

Swarm member avatars will move continuously inside the swarm node radius while preserving:

- deterministic behavior per swarm slot
- bounded placement inside the existing node radius
- current per-count member scaling
- stable avatar appearance per slot seed

### How

Reuse existing deterministic utilities:

- `resolveSwarmAvatarSlotSeed()` for stable slot identity
- `pseudoRandom()` for deterministic per-slot parameters
- the current `resolveSwarmAvatarPlacement()` radius/scale envelope

No runtime ECS or command changes are required. This is a pure display-layer change.

---

## 6.2 Motion contract

For each slot:

- derive a deterministic `slotSeed` from `resolveSwarmAvatarSlotSeed(entityId, index)`
- derive deterministic motion parameters from `pseudoRandom(slotSeed + suffix)`:
    - base angular offset
    - angular velocity
    - radial phase
    - radial amplitude

- compute the avatar position each tick from `timeMs`
- clamp the effective radius so the rendered avatar stack never exceeds the swarm node boundary

Visual rules:

- member scale remains driven by swarm `count`
- very small swarms still stay legible and separated
- dense swarms still compress inward as count grows
- motion must be smooth; no per-frame reseeding and no teleporting

Determinism rules:

- same runtime seed + same swarm slot count + same entity id + same time progression → same motion
- slot appearance identity stays stable because the slot seed already exists and is unchanged

---

## 6.3 Files to change

### `src/engine/phaser/display/avatar/swarmAvatarLayout.ts`

**Responsibility after change**

Remain the canonical swarm placement math module, now with time-based deterministic motion.

**Logic after change**

Extend the placement function so it can compute animated placement using:

- node radius
- member count
- slot index
- time in milliseconds
- deterministic slot seed

The function must preserve the current static layout envelope rules:

- one member stays centered
- small swarms keep ring-like separation
- large swarms compress inward

The difference is that each member now moves along a deterministic orbit/jitter path within its allowable radius band.

**Interface after change**

Change the exported interface from the current static signature to an animated signature that includes both time and deterministic seed input.

The return type stays `SwarmAvatarPlacement`.

### `src/engine/phaser/display/modules/SwarmAvatarModule.ts`

**Responsibility after change**

Continue to render swarm avatar stacks each tick.

**Logic after change**

For each slot on each tick:

1. derive the slot seed with `resolveSwarmAvatarSlotSeed(tickCtx.spec.entityId, index)`
2. call the updated placement function with:
    - `tickCtx.spec.radius`
    - `count`
    - `index`
    - `tickCtx.timeMs`
    - `slotSeed`

3. keep the existing appearance resolution and avatar rendering path unchanged

This file must not generate nondeterministic motion with `Math.random()`.

**Interface after change**

No public module interface change.

### `src/engine/phaser/display/avatar/swarmAvatarLayout.test.ts`

**Responsibility after change**

Validate both the existing bounds contract and the new motion contract.

**Required test cases**

- invalid count/index still throws
- placements remain finite and inside the swarm radius at multiple timestamps
- the same inputs produce the same placement at the same timestamp
- the same slot moves between timestamps
- small swarms still maintain readable separation
- dense swarms still compress inward relative to sparse swarms

### `src/engine/phaser/display/modules/SwarmAvatarModule.test.ts` — **new**

**Responsibility**

Verify that the display module feeds time and deterministic slot seed into the animated placement path.

**Required test cases**

- slot placement is recomputed with `timeMs`
- slot seed is based on `entityId` and `index`
- negative `swarm.count` still follows the current explicit error/reset behavior

---

## 6.4 Acceptance criteria

- swarm avatars visibly move around the node over time
- avatars stay inside the existing visual radius bounds
- motion is deterministic and smooth
- no runtime/gameplay logic changes are introduced

---

## 7. Cross-cutting test plan

The test plan follows the uploaded testing standard: isolate logic into pure helpers where possible, cover happy/negative/edge paths, keep UI tests to presentation/wiring, and keep tests readable using Given/When/Then structure.

### 7.1 Unit tests

Target:

- `projectManifest.ts`
- `projectVersionTracker.ts`
- `swarmAvatarLayout.ts`
- small helper additions in shell controller helpers

Coverage:

- version parsing
- semver bump math
- manifest change classification
- staged-cycle escalation and clear behavior
- animated placement determinism and bounds

### 7.2 Integration tests

Target:

- `useAppBootstrap.test.tsx`
- `moduleStore.io.test.ts`
- `useManifestDraft.test.ts`
- `RawJsonEditor` tests
- `RefactorService.test.ts`
- `projectSaveCommand` tests
- `useAppShellController` tests

Coverage:

- bootstrap winner selection between VFS and snapshot
- project version application through real save flows
- autosave-gated new-game behavior

### 7.3 View tests

Target:

- existing app-shell hook tests
- no new UI business logic in components

Coverage:

- NEW GAME action wiring only
- no extra UI-only logic hidden in `.tsx`

---

## 8. Out-of-scope files

The following files do not need behavioral changes for this work:

- `NewGameDialog.tsx`
    - the dialog text remains valid; the dialog simply appears less often

- `FaceSystem.ts` and face aggregation code
    - swarm membership/totals are unchanged

- save slot UI components
    - save discovery already exists and is sufficient

---

## 9. Final implementation checklist

1. Add manifest `version` support with backward-compatible reads and strict future validation
2. Add the staged project version tracker
3. Update bootstrap to compare snapshot vs in-memory project versions before importing `vfs-prod.json`
4. Stage and persist project version changes through all save paths that can mutate project-owned files
5. Gate NEW GAME confirmation on actual `autosave` existence
6. Animate swarm avatar placement deterministically in the display layer
7. Add unit/integration/view tests for all new contracts

If you want, I can also reformat this into a tighter eng-spec style with numbered requirements and a per-file implementation checklist.
