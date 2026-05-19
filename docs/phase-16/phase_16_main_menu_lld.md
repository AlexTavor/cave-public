# Phase 16 — Main Menu LLD

## 1. Scope

This document defines the low-level design for the Phase 16 main-menu rework.

It covers:
- shell state and transitions for menu, game, devtools, save/load, and cinematic
- atomic-UI-compliant main-menu composition
- fixed top-right menu access button
- runtime chrome visibility rules
- menu ambient background runtime
- play/continue, save, load, devtools, and cinematic execution flow
- autosave behavior
- tests required to make the phase contract-complete

It does **not** cover unrelated refactors, new gameplay features, or new editor capabilities.

---

## 2. Authoritative Inputs

This design is constrained by the current codebase and the uploaded project contracts.

### 2.1 Code facts confirmed in the current tree

1. `src/App.tsx` currently uses local React state with `type AppMode = "menu" | "game" | "editor"` and mounts `RuntimeShell` unconditionally under the overlays.
2. `src/App.styles.ts` currently declares `point-events: none;` on `OverlayLayer`; this is a typo and must be corrected to `pointer-events`.
3. `src/ui/production/MainMenu.tsx` is hand-styled and does not use the atomic UI atoms (`Card`, `SmartTooltip`, `Button`).
4. `src/ui/runtime/shell/RuntimeShell.tsx` always renders gameplay overlays and the bottom status bar.
5. `src/ui/runtime/shell/SaveLoadMenu.tsx` is a floating runtime widget, not a menu-driven overlay.
6. `src/ui/devtools/shell/hooks/useGlobalKeys.ts` currently owns the global devtools toggle and only handles `Backquote` and `IntlBackslash`.
7. `src/ui/runtime/cinematic/Cinematic.tsx` already exists and exposes `cinematics?: string[]` and `onComplete?: () => void`.
8. `src/ui/runtime/state/useRuntimeStore.ts` already exposes `loadCartridge`, `play`, `pause`, `saveGame`, `loadGame`, `deleteSave`, and `reset`.
9. `src/data/raw/example/scripts/start.cvs` starts with `game.reset`, then `project-load example/manifest.json`, and finally `tick.run`.
10. `src/ui/runtime/terminal/commands/gameResetCommand.ts` returns `Runtime not ready.` when no runtime exists.
11. `src/app-shell/useAppBootstrap.ts` already resolves whether a manifest exists, but it does not expose the resolved manifest path.
12. `src/data/schemas/game/config.ts` currently has no menu-background config section.
13. `src/engine/phaser/display/DisplayDefinitionCatalog.ts` currently has no display definition for a menu-only glyph+glow+pulse entity.
14. `src/engine/phaser/display/modules/PulseModule.ts` already exists and can be reused.
15. `src/ui/lib/atoms/modal/Modal.tsx` already handles local `Escape` close for modal dialogs.
16. Local text-input escape handling already exists in multiple editors; some handlers stop propagation, and terminal autocomplete uses `preventDefault()` for local cancel.

### 2.2 Contract constraints

Implementation and tests for this phase must respect the existing project laws:
- UI observes state and never mutates simulation directly.
- All app-level mutable shell state must live in Zustand.
- `.tsx` files render and delegate logic to hooks, stores, or services.
- Runtime mutations must continue to flow through the command/apply pipeline.
- Tests must verify behavior, not internal implementation details.

---

## 3. Why This Phase Exists

The current implementation is materially incompatible with the requested product behavior.

### 3.1 Main menu mismatches

The current menu is a centered modal card with two plain buttons. It does not use the canonical atomic UI library, it does not render actions as clickable cards, and it does not support the required action set (`PLAY/CONTINUE`, `SAVE`, `LOAD`, `DEV TOOLS`).

### 3.2 Shell-state mismatch

A single `"menu" | "game" | "editor"` mode is insufficient. The requested UX needs:
- a visible surface (`game` vs `devtools`)
- an overlay (`main menu`, `save`, `load`, `cinematic`, or none)
- an active-session flag to switch `PLAY` into `CONTINUE`
- explicit origin-sensitive transitions for `Escape` and the top-right menu button

### 3.3 Runtime-chrome mismatch

The runtime bottom bar and save widget are currently part of the always-mounted runtime shell. That conflicts with the requirement that the game bottom bar must not be visible under the menu.

### 3.4 Background mismatch

The current menu background is not a runtime. The requested menu background must be an active runtime with display and physics entities, pulse animation, and configurable movement distribution.

### 3.5 Boot / play mismatch

The requested play flow is:
1. close the menu
2. mount a cinematic
3. on cinematic completion, run `start.cvs`

That cannot be satisfied by the current `handlePlay()` because it only switches the local UI mode to `"game"`. It does not resolve the workspace manifest, it does not load a project into the runtime, and it does not run a cinematic or script.

### 3.6 Runtime precondition mismatch

Because `start.cvs` begins with `game.reset`, the gameplay runtime must already exist before the cinematic completion hook executes `run example/scripts/start.cvs`. Any design that runs the script before a runtime is loaded is invalid.

---

## 4. Non-Goals

This phase does **not**:
- redesign the devtools layout system
- add new save-file formats
- change runtime persistence format
- change the `Cinematic` component API
- author main-menu cinematic copy
- alter gameplay systems unrelated to menu entry, autosave, or background ambiance

---

## 5. Required External Input

### 5.1 Cinematic copy is not present in the current repo

There is no existing main-menu cinematic content source in the inspected codebase.

Therefore this phase must distinguish between:
- **lifecycle wiring**: in scope and fully specified here
- **approved cinematic text**: external product/content input not present in the repo

Implementation must **not invent narrative copy**. The phase must provide a dedicated constant/input for the lines and wire the mount/completion flow around it. Tests for this phase must validate lifecycle and completion behavior, not exact prose.

---

## 6. Functional Contract

### 6.1 Shell surfaces and overlays

The shell has exactly two visible surfaces:
- `game`
- `devtools`

The shell has exactly five overlay states:
- `none`
- `main-menu`
- `save-menu`
- `load-menu`
- `cinematic`

The shell also tracks whether an active gameplay session exists.

### 6.2 Main-menu action contract

When there is **no** active gameplay session, the main menu shows:
- `PLAY`
- `LOAD`
- `DEV TOOLS`

When there **is** an active gameplay session and the menu was opened from the game surface, the main menu shows:
- `CONTINUE`
- `SAVE`
- `LOAD`
- `DEV TOOLS`

When there **is** an active gameplay session and the menu was opened from the devtools surface, the main menu shows:
- `CONTINUE`
- `LOAD`
- `DEV TOOLS`

`SAVE` is shown only when the main menu is being used as an in-game pause menu.

### 6.3 Escape behavior contract

`Escape` obeys this precedence order:

1. If a focused local control has already consumed the key (`event.defaultPrevented === true`), the shell does nothing.
2. If the event target is an editable text field and the local control has not bubbled a shell-intent event, the shell does nothing.
3. If a modal save/load dialog is open, the dialog closes using its own local close contract.
4. If the devtools surface is visible, `Escape` closes devtools and opens the main menu.
5. If the game surface is visible and no shell overlay is open, `Escape` pauses gameplay and opens the main menu.
6. No other global `Escape` behavior is introduced in this phase.

This preserves the explicitly requested rule: text-input `Escape` remains local cancel behavior, and everywhere else `Escape` performs the shell action.

### 6.4 Devtools hotkey contract

The devtools hotkey remains:
- `KeyboardEvent.code === "Backquote"`
- `KeyboardEvent.code === "IntlBackslash"`

Those keys open devtools using the same action as the `DEV TOOLS` menu card.

This phase does **not** redefine those keys to open the main menu.

### 6.5 Top-right menu button contract

A fixed button is visible in the top-right corner when either of these is true:
- gameplay surface is visible
- devtools surface is visible

It is hidden while the main menu, save menu, load menu, or cinematic overlay is already visible.

Button behavior:
- from gameplay: pause runtime, open main menu
- from devtools: close devtools, open main menu

### 6.6 Play / continue contract

`PLAY`:
1. resolves the current workspace manifest path
2. loads the project into the runtime
3. marks a gameplay session as active
4. opens the cinematic overlay
5. on cinematic completion, executes `run example/scripts/start.cvs`

`CONTINUE`:
1. closes the main menu
2. returns to the gameplay surface
3. resumes the gameplay runtime

### 6.7 Save / load contract

`SAVE` opens the save dialog in save mode.

`LOAD` opens the save dialog in load mode.

Selecting a save target in save mode writes the save and returns to the main menu.

Selecting a save target in load mode loads the save, sets gameplay session active, closes shell overlays, shows the gameplay surface, and resumes the runtime.

### 6.8 Autosave contract

Autosave runs every 5 seconds while **all** of the following are true:
- an active gameplay session exists
- the visible surface is `game`
- no shell overlay is open
- the gameplay runtime exists
- runtime status is `running`

Autosave target name is exactly `autosave`.

Autosave never runs for:
- the menu ambient runtime
- paused gameplay
- devtools surface
- menu/save/load/cinematic overlays

### 6.9 Runtime-chrome visibility contract

Gameplay runtime chrome is visible only when the gameplay surface is visible and no shell overlay is open.

Gameplay runtime chrome includes:
- selection overlay
- draft overlay
- dormancy overlay
- living-card pool
- bottom status bar

The floating `SaveLoadMenu` widget is removed from gameplay runtime chrome in this phase.

### 6.10 Ambient background contract

When the main menu is visible, a dedicated ambient runtime is mounted behind it.

This ambient runtime:
- is separate from the gameplay runtime
- is not saved or loaded
- uses display + physics entities
- renders glyph + glow only
- uses pulse animation
- meanders entities across the screen
- is configured from `game_config.menuAmbient`

Gameplay runtime remains mounted independently.

---

## 7. UI Architecture (Atomic UI)

This phase must use Atomic UI composition explicitly.

### 7.1 Existing atoms reused

The design reuses the existing atoms already in `src/ui/lib/atoms/**`:
- `Card`
- `Button`
- `SmartTooltip`
- `Modal`
- `Animatable` (only where motion is already consistent with the UI library)

### 7.2 New molecules

#### `MainMenuActionCard`
A clickable card representing one menu action.

Responsibilities:
- render one action as a full-width interactive `Card`
- render the action label in large, bold, colored text
- render the action description in smaller, plain-color text
- expose disabled state
- expose click callback

#### `SaveSlotCard`
A card row for one save slot.

Responsibilities:
- show save name
- show current-save marker
- expose load/delete actions
- render using atomic `Card` and `Button`

#### `MenuAccessButton`
The fixed top-right menu button.

Responsibilities:
- render atomic `Button`
- wrap with `SmartTooltip`
- expose one click callback
- remain visually independent from game and devtools layouts

### 7.3 New organisms

#### `MainMenuPanel`
The full main-menu panel organism.

Responsibilities:
- render the title centered at the top
- render the action-card stack
- render status/error blocks
- receive its action model from a controller; no menu business logic in the component

#### `SaveMenuDialog`
The save/load overlay organism.

Responsibilities:
- render save or load mode inside atomic `Modal`
- render slot list via `SaveSlotCard`
- own only local input/filter state
- delegate save/load/delete actions to callbacks

### 7.4 Rule for `.tsx`

All transition logic, autosave logic, command execution, and key handling must stay outside render components.

The new `.tsx` files only render props and invoke callbacks.

---

## 8. State Model

## 8.1 App-shell store

A dedicated Zustand store is required for app-shell UI state.

### Store shape

`AppShellState`
- `surface: "game" | "devtools"`
- `overlay: "none" | "main-menu" | "save-menu" | "load-menu" | "cinematic"`
- `menuOrigin: "boot" | "game" | "devtools"`
- `hasActiveGameSession: boolean`

### Store actions

- `openMainMenuFromBoot()`
- `openMainMenuFromGame()`
- `openMainMenuFromDevtools()`
- `openSaveMenu()`
- `openLoadMenu()`
- `openDevtools()`
- `closeDevtools()`
- `startGameplaySession()`
- `endGameplaySession()`
- `showCinematic()`
- `closeOverlay()`
- `returnToGame()`

### State invariants

1. `save-menu` and `load-menu` are only valid when `overlay !== none`.
2. `hasActiveGameSession === false` forbids `CONTINUE`.
3. `menuOrigin === game` is the only state that permits `SAVE`.
4. `overlay === cinematic` implies `surface === game`.
5. `surface === devtools` and `overlay === none` means devtools are visibly mounted.

---

## 9. Shell Flow

### 9.1 Boot

Initial state:
- `surface = game`
- `overlay = main-menu`
- `menuOrigin = boot`
- `hasActiveGameSession = false`

### 9.2 DEV TOOLS from menu

Transition:
- `surface := devtools`
- `overlay := none`
- `menuOrigin` unchanged until next menu open

### 9.3 Escape from devtools

Transition:
- `surface := game`
- `overlay := main-menu`
- `menuOrigin := devtools`
- gameplay runtime is not resumed automatically by this transition

### 9.4 Escape from gameplay

Transition:
- call `useRuntimeStore.getState().pause()`
- `overlay := main-menu`
- `menuOrigin := game`

### 9.5 PLAY

Preconditions:
- bootstrap complete
- resolved workspace manifest path is not null

Transition:
- load project into gameplay runtime
- set gameplay session active
- show cinematic overlay
- keep gameplay runtime paused until cinematic completes

### 9.6 Cinematic complete

Transition:
- execute `run example/scripts/start.cvs`
- close cinematic overlay
- gameplay surface remains visible

### 9.7 CONTINUE

Transition:
- close overlay
- call `useRuntimeStore.getState().play()`

### 9.8 LOAD success

Transition:
- call `useRuntimeStore.getState().loadGame(name)`
- set gameplay session active
- `surface := game`
- `overlay := none`
- call `useRuntimeStore.getState().play()`

### 9.9 SAVE success

Transition:
- call `useRuntimeStore.getState().saveGame(name)`
- `overlay := main-menu`
- surface and pause state unchanged

---

## 10. Workspace Manifest Resolution

The bootstrap hook already knows how to detect a workspace manifest, including nested manifest paths.

That resolver must become a shared app-shell utility so it can be reused by:
- `useAppBootstrap`
- PLAY flow
- ambient-runtime configuration loading

### Required behavior

`resolveWorkspaceManifestPath()` returns:
- the exact manifest path string when a manifest exists
- `null` when no manifest exists

It must preserve the existing nested-manifest behavior already tested by `useAppBootstrap.test.tsx`.

---

## 11. Command Execution for PLAY Flow

A menu-triggered command executor is required because PLAY and cinematic completion must run terminal commands without going through the devtools terminal UI.

### Required interface

`ShellCommandExecutor`
- `execute(command: string): Promise<CommandResult>`

### Required behavior

The executor must use the same command registries already used by the terminal:
- `STANDARD_COMMANDS`
- `RUNTIME_COMMANDS`

The executor context must expose the same runtime/UI side effects required by:
- `project-load`
- `run`
- `game.reset`
- `tick.run`

### Error behavior

If command execution fails:
- the failure must be returned to the caller
- the caller must surface the error in shell state; no silent failure is allowed

### Important precondition

The PLAY flow must call project/runtime load before cinematic completion calls `run example/scripts/start.cvs`, because `game.reset` requires a runtime.

---

## 12. Menu Ambient Runtime Design

## 12.1 Overview

The menu background is implemented as a dedicated ambient runtime, not as CSS and not as the gameplay runtime.

This ambient runtime is mounted only while the main menu is visible.

## 12.2 Configuration source

Ambient behavior is configured from `game_config.menuAmbient`.

### New config schema

`menuAmbient`
- `entityCount: number`
- `minSpeedPxPerSecond: number`
- `maxSpeedPxPerSecond: number`
- `speedCurve: "linear" | "inExpo" | "outExpo"`
- `retargetIntervalMsMin: number`
- `retargetIntervalMsMax: number`

### Required defaults

Defaults must satisfy the product requirement that most entities stay in the 5–20 px/s range while rare outliers can reach 300 px/s.

Therefore the default values are:
- `entityCount = 72`
- `minSpeedPxPerSecond = 5`
- `maxSpeedPxPerSecond = 300`
- `speedCurve = "inExpo"`
- `retargetIntervalMsMin = 1800`
- `retargetIntervalMsMax = 5200`

`inExpo` is the default because the stated target distribution is low-speed-heavy with rare fast outliers. `outExpo` remains available as an explicit config choice because the requested direction mentioned an easing function like out-expo.

## 12.3 Synthetic cartridge

A synthetic ambient `ModuleCartridge` is created in code.

It contains exactly two blueprint types:

### `menu_ambient_agent`
Components:
- `display` with `display_key = "menu_ambient_entity"`
- `physics`

Properties:
- visible
- rendered as glyph + glow only
- non-static physics body

### `menu_ambient_anchor`
Components:
- `physics`

Properties:
- no display component
- static physics body
- used only as a moving target for one ambient agent

## 12.4 Spawn topology

For each ambient index `i`:
- spawn one `menu_ambient_agent` with id `menu_agent_{i}`
- spawn one `menu_ambient_anchor` with id `menu_anchor_{i}`
- position both within world bounds
- set the agent target to its corresponding anchor

There is a strict 1:1 mapping between agent and anchor ids.

## 12.5 Motion system

A dedicated runtime system, `MenuAmbientWanderSystem`, controls the ambient anchors.

### Responsibilities

For each ambient pair:
- derive a deterministic per-entity speed sample from the configured range and curve
- derive a deterministic retarget interval from the configured min/max interval
- maintain per-entity next-retarget timestamp in system-local deterministic state
- when due, emit a `POSITION_ENTITY` command for the entity’s anchor id with a new random position inside world bounds

### Determinism source

Sampling uses `pseudoRandom()` with a stable seed composed from:
- runtime seed
- entity id
- sampled field name (`speed`, `interval`, `x`, `y`)

### Mutation rule

The system never mutates ECS or physics bodies directly.

It emits commands only.

## 12.6 Display definition

A dedicated display definition is required for the ambient entities.

### `menu_ambient_entity`
Module stack:
- `TransformModule`
- `createGlyphModule(glyphRegistry)`
- `createPulseModule(...)`

It must **not** include:
- `BackgroundModule`
- `InteractionModule`
- `SelectionModule`
- `DistressModule`

This guarantees the requested visual contract: standard glyph with glow, plus pulse, and nothing else.

---

## 13. Runtime Shell Design

## 13.1 RuntimeShell becomes chrome-configurable

`RuntimeShell` must stop hard-coding gameplay overlays.

### New public interface

`RuntimeShellProps`
- `chrome: "full" | "minimal"`

### `full` behavior

Render:
- game canvas
- selection overlay
- draft overlay
- dormancy overlay
- living-card pool
- bottom status bar

### `minimal` behavior

Render:
- game canvas only

`RuntimeShell` no longer renders `SaveLoadMenu` in any mode.

## 13.2 App-level layering

The app root mounts layers in this order:

1. gameplay runtime layer
2. ambient runtime layer (only while main menu is visible)
3. main-menu or save/load overlay layer
4. cinematic overlay layer
5. devtools overlay layer
6. fixed top-right menu access button layer

The top-right button layer must sit above game and devtools, but below modal overlays.

---

## 14. Save / Load Overlay Design

## 14.1 Replacement of the floating widget

The existing runtime-side `SaveLoadMenu` floating panel is removed.

The replacement is a shell overlay dialog.

## 14.2 Dialog interface

`SaveMenuDialogProps`
- `mode: "save" | "load"`
- `isOpen: boolean`
- `availableSaves: string[]`
- `currentSaveName: string | null`
- `canSave: boolean`
- `onClose: () => void`
- `onSaveAs: (name: string) => Promise<void> | void`
- `onLoad: (name: string) => Promise<void> | void`
- `onDelete: (name: string) => Promise<void> | void`

## 14.3 Dialog behavior

### Save mode
- show a text input for the new save name
- show existing save slots
- allow overwrite by selecting an existing slot
- after a successful save, close the dialog back to the main menu

### Load mode
- show existing save slots
- load on slot selection
- after a successful load, close all overlays and enter gameplay

### Escape behavior

The dialog uses the existing atomic `Modal` close behavior.

Global shell `Escape` handling does not run while this dialog is open.

---

## 15. Devtools Key Handling Refactor

The current `useGlobalKeys()` in the devtools shell is too narrow for the new shell contract.

### Required change

Move global shell hotkey responsibility out of `src/ui/devtools/shell/hooks/useGlobalKeys.ts` and into a new app-shell hook mounted once by `App.tsx`.

### New responsibilities of the app-shell hotkey hook

Handle:
- `Backquote`
- `IntlBackslash`
- global shell `Escape`

### Remaining responsibility of the devtools shell

No shell-global key behavior remains inside `EditorShell` after this phase.

`EditorShell` remains responsible only for rendering devtools and layout-specific hooks.

---

## 16. File-by-File Design

This section defines every file to add, change, or remove in this phase.

### 16.1 Changed files

#### `src/App.tsx`
**Responsibility**
- compose the shell layers
- read app-shell state and runtime state
- mount overlays and fixed button

**Logic**
- replace local `useState<AppMode>` with Zustand selectors from the new app-shell store
- mount `useShellHotkeys()` and `useRuntimeAutosave()`
- pass `chrome="full"` or `chrome="minimal"` to `RuntimeShell`
- mount `MenuAmbientRuntime` while `overlay === "main-menu"`
- mount `MainMenu`, `SaveMenuDialog`, and `Cinematic` according to shell state

**Interface**
- no new public props

#### `src/App.styles.ts`
**Responsibility**
- define app root and overlay layout styles

**Logic**
- correct `point-events` to `pointer-events`
- provide distinct layers for runtime, ambient runtime, overlays, and fixed menu button

**Interface**
- exports the styled layer containers used by `App.tsx`

#### `src/app-shell/useAppBootstrap.ts`
**Responsibility**
- bootstrap VFS
- import fallback snapshot if needed
- expose workspace readiness to the shell

**Logic**
- delegate manifest resolution to the shared resolver
- extend returned state with `workspaceManifestPath: string | null`

**Interface**
`AppBootstrapState`
- `isBootstrapping: boolean`
- `bootstrapError: string | null`
- `hasWorkspaceManifest: boolean`
- `workspaceManifestPath: string | null`

#### `src/data/schemas/game/config.ts`
**Responsibility**
- own the authoritative game-config schema

**Logic**
- add `MenuAmbientConfigSchema`
- add `menuAmbient` to `GameConfigSchema`
- define defaults exactly as in section 12.2

**Interface**
New exported types:
- `MenuAmbientConfig`

#### `src/engine/phaser/display/DisplayDefinitionCatalog.ts`
**Responsibility**
- register display definitions

**Logic**
- register the new `menu_ambient_entity` display definition
- do not alter existing gameplay display definitions

**Interface**
- unchanged external function signature

#### `src/ui/production/MainMenu.tsx`
**Responsibility**
- act as the feature-level main-menu façade

**Logic**
- stop rendering hand-styled buttons directly
- compose `MainMenuPanel`
- derive visible actions from props supplied by the app-shell controller

**Interface**
Replace current props with:
- `title: string`
- `statusText: string`
- `errorText: string | null`
- `actions: MainMenuActionModel[]`

`MainMenuActionModel`
- `id: "play" | "continue" | "save" | "load" | "devtools"`
- `label: string`
- `description: string`
- `disabled: boolean`
- `onSelect: () => void`
- `tone: "primary" | "default"`

#### `src/ui/devtools/shell/hooks/useGlobalKeys.ts`
**Responsibility**
- removed from shell-global ownership

**Logic**
- this file is deleted in this phase; shell-global key handling moves to app-shell

**Interface**
- none after deletion

#### `src/ui/runtime/shell/RuntimeShell.tsx`
**Responsibility**
- mount a gameplay Phaser runtime viewport with configurable chrome

**Logic**
- accept the new `chrome` prop
- render world-only canvas in `minimal` mode
- remove `SaveLoadMenu`

**Interface**
`RuntimeShellProps`
- `chrome: "full" | "minimal"`

#### `src/App.test.tsx`
**Responsibility**
- verify shell composition and top-level transitions

**Logic**
- replace the old `menu/game/editor` assertions with shell-store-based assertions
- verify PLAY, CONTINUE, devtools, fixed menu button, and cinematic lifecycle behavior

**Interface**
- test file only

#### `src/ui/production/MainMenu.test.tsx`
**Responsibility**
- verify main-menu rendering and action wiring

**Logic**
- assert card-based action rendering and click behavior
- assert PLAY vs CONTINUE action selection
- assert disabled states

**Interface**
- test file only

#### `src/ui/runtime/shell/RuntimeShell.test.tsx`
**Responsibility**
- verify full/minimal runtime-shell rendering

**Logic**
- assert status bar is present only in `full`
- assert world canvas always renders

**Interface**
- test file only

### 16.2 Added files

#### `src/app-shell/resolveWorkspaceManifestPath.ts`
**Responsibility**
- expose manifest-path resolution as a reusable app-shell utility

**Logic**
- inspect `vfs.listFiles()` when available
- prefer `manifest.json` at root when present
- otherwise return the first discovered nested manifest path
- fall back to `vfs.readFile("manifest.json")` only when file listing is unavailable

**Interface**
`resolveWorkspaceManifestPath(): Promise<string | null>`

#### `src/app-shell/useAppShellStore.ts`
**Responsibility**
- own app-shell UI state in Zustand

**Logic**
- implement the state shape and actions in section 8
- expose selector-friendly granular fields/actions

**Interface**
Exports:
- `useAppShellStore`
- `AppShellState`
- `AppShellOverlay`
- `AppShellSurface`

#### `src/app-shell/useShellHotkeys.ts`
**Responsibility**
- own all shell-global keyboard behavior

**Logic**
- attach a single global `keydown` listener
- ignore locally consumed events
- implement the exact escape and devtools-hotkey contract from sections 6.3 and 6.4

**Interface**
- React hook with no arguments and no return value

#### `src/app-shell/shellCommandExecutor.ts`
**Responsibility**
- execute terminal commands for the shell without mounting the devtools terminal UI

**Logic**
- create a `CommandRegistry` from `STANDARD_COMMANDS` and `RUNTIME_COMMANDS`
- build execution context from `useRuntimeStore`, `useShellStore`, and workspace services
- expose `execute()`

**Interface**
- `createShellCommandExecutor(): ShellCommandExecutor`
- `ShellCommandExecutor.execute(command: string): Promise<CommandResult>`

#### `src/app-shell/useRuntimeAutosave.ts`
**Responsibility**
- own autosave timing side effects for the gameplay runtime

**Logic**
- use a 5000 ms interval
- gate execution with the autosave contract in section 6.8
- call `saveGame("autosave")`
- surface save errors loudly to the console and shell log; no silent failure

**Interface**
- React hook with no arguments and no return value

#### `src/ui/production/main-menu/MainMenuActionCard.tsx`
**Responsibility**
- render one main-menu action card molecule

**Logic**
- wrap the action in atomic `Card` with `interactive={true}`
- use button semantics for keyboard accessibility
- render label and description with required hierarchy

**Interface**
`MainMenuActionCardProps`
- `label: string`
- `description: string`
- `tone: "primary" | "default"`
- `disabled: boolean`
- `onSelect: () => void`

#### `src/ui/production/main-menu/MainMenuPanel.tsx`
**Responsibility**
- render the main-menu panel organism

**Logic**
- render centered title
- stack `MainMenuActionCard` molecules
- render status and error blocks

**Interface**
`MainMenuPanelProps`
- `title: string`
- `statusText: string`
- `errorText: string | null`
- `actions: MainMenuActionModel[]`

#### `src/ui/production/main-menu/MenuAccessButton.tsx`
**Responsibility**
- render the fixed top-right menu button molecule

**Logic**
- use atomic `Button`
- wrap in `SmartTooltip`
- use fixed positioning in the app shell layer

**Interface**
`MenuAccessButtonProps`
- `visible: boolean`
- `onOpenMenu: () => void`
- `tooltipText: string`

#### `src/ui/production/save-menu/SaveSlotCard.tsx`
**Responsibility**
- render one save slot molecule

**Logic**
- show slot name, current marker, load action, delete action
- render with atomic `Card` and `Button`

**Interface**
`SaveSlotCardProps`
- `name: string`
- `isCurrent: boolean`
- `mode: "save" | "load"`
- `onSelect: () => void`
- `onDelete: () => void`

#### `src/ui/production/save-menu/SaveMenuDialog.tsx`
**Responsibility**
- render the save/load dialog organism

**Logic**
- use atomic `Modal`
- render input only in save mode
- render slot list with `SaveSlotCard`
- keep only local input/filter state

**Interface**
Same as section 14.2.

#### `src/ui/runtime/ambient/createMenuAmbientCartridge.ts`
**Responsibility**
- construct the synthetic ambient `ModuleCartridge`

**Logic**
- create the two ambient blueprints
- inject `menuAmbient` config into the cartridge settings
- keep the cartridge independent from gameplay save/load

**Interface**
`createMenuAmbientCartridge(config: MenuAmbientConfig): ModuleCartridge`

#### `src/ui/runtime/ambient/MenuAmbientWanderSystem.ts`
**Responsibility**
- own ambient-anchor retargeting logic

**Logic**
- deterministic sampling of speed and retarget interval per entity
- emit `POSITION_ENTITY` commands for anchor ids only
- never mutate entities or bodies directly

**Interface**
`new MenuAmbientWanderSystem(params)` where `params` contains:
- `config: MenuAmbientConfig`
- `seed: string`
- `worldWidth: () => number`
- `worldHeight: () => number`

#### `src/ui/runtime/ambient/buildMenuAmbientRuntime.ts`
**Responsibility**
- build the dedicated ambient runtime instance

**Logic**
- create synthetic cartridge
- create runtime via `createGame(...)`
- register `MenuAmbientWanderSystem`
- spawn ambient pairs and bind agents to anchors
- start the ticker immediately

**Interface**
`buildMenuAmbientRuntime(config: MenuAmbientConfig, seed: string): Runtime`

#### `src/ui/runtime/ambient/MenuAmbientRuntime.tsx`
**Responsibility**
- mount the ambient runtime under the main menu

**Logic**
- resolve ambient config from the workspace manifest path when available
- fall back to `DEFAULT_GAME_CONFIG.menuAmbient` when no manifest path exists
- create and destroy the ambient runtime with lifecycle-safe hooks
- render a minimal `RuntimeShell` backed by the ambient runtime context

**Interface**
`MenuAmbientRuntimeProps`
- `manifestPath: string | null`

#### `src/engine/phaser/display/MenuAmbientDisplayDefinition.ts`
**Responsibility**
- encapsulate the ambient display definition

**Logic**
- export a single `DisplayDefinition` factory for `menu_ambient_entity`
- compose `TransformModule`, glyph, and pulse only

**Interface**
`createMenuAmbientDisplayDefinition(glyphRegistry: GlyphRegistry): DisplayDefinition`

### 16.3 Deleted files

#### `src/ui/production/MainMenu.styles.ts`
Reason:
- the phase replaces bespoke menu styling with Atomic UI composition

#### `src/ui/runtime/shell/SaveLoadMenu.tsx`
Reason:
- the floating runtime widget conflicts with the required menu-driven save/load UX

#### `src/ui/runtime/shell/SaveLoadMenu.styles.ts`
Reason:
- deleted with the floating widget

#### `src/ui/runtime/shell/SaveLoadMenu.test.tsx`
Reason:
- replaced by `SaveMenuDialog` view tests

#### `src/ui/runtime/shell/SaveSlotRow.tsx`
Reason:
- replaced by the atomic `SaveSlotCard` molecule

---

## 17. Error Handling Contract

No error in this phase may fail silently.

### 17.1 Bootstrap failure

Behavior:
- main menu remains visible
- PLAY is disabled
- DEV TOOLS remains available if bootstrap is complete enough to mount it
- error text is rendered in the menu panel

### 17.2 Manifest resolution failure on PLAY

Behavior:
- cinematic does not open
- gameplay session is not marked active
- error text is rendered in the menu panel

### 17.3 Command execution failure

Behavior:
- failure is returned from the shell command executor
- overlay state remains stable
- error is surfaced in shell UI or shell log

### 17.4 Autosave failure

Behavior:
- autosave interval continues running
- error is logged loudly
- gameplay session is not terminated

### 17.5 Ambient runtime failure

Behavior:
- failure is logged loudly
- menu remains usable
- ambient layer may render empty, but menu actions remain functional

---

## 18. Test Plan

Tests must follow the project testing standard: behavior-focused, human-readable Given/When/Then structure, no implementation-detail assertions.

### 18.1 View tests

#### `src/App.test.tsx`
Must verify:
1. boot state shows main menu and ambient runtime layer
2. PLAY loads runtime then opens cinematic overlay
3. cinematic completion executes `run example/scripts/start.cvs`
4. CONTINUE closes menu and resumes gameplay
5. DEV TOOLS switches to devtools surface
6. fixed top-right button is visible on game and devtools surfaces only
7. gameplay runtime chrome is hidden while menu overlays are open

#### `src/ui/production/MainMenu.test.tsx`
Must verify:
1. title renders
2. action cards render in the correct combinations (`PLAY` vs `CONTINUE`, `SAVE` visibility rule)
3. disabled actions do not fire callbacks
4. error/status text renders correctly

#### `src/ui/production/save-menu/SaveMenuDialog.test.tsx`
Must verify:
1. save mode renders input and slots
2. load mode renders slots without save input
3. selecting a slot invokes the correct callback
4. delete invokes the correct callback
5. modal close invokes `onClose`

#### `src/ui/runtime/shell/RuntimeShell.test.tsx`
Must verify:
1. `full` mode renders the status bar
2. `minimal` mode omits gameplay chrome
3. world canvas renders in both modes

### 18.2 Store / hook tests

#### `src/app-shell/useAppShellStore.test.ts`
Must verify:
1. boot state invariants
2. escape-from-game transition
3. escape-from-devtools transition
4. PLAY/CONTINUE state transitions
5. save/load overlay transitions

#### `src/app-shell/useShellHotkeys.test.tsx`
Must verify:
1. `Backquote` opens devtools
2. `IntlBackslash` opens devtools
3. `Escape` from gameplay pauses and opens menu
4. `Escape` from devtools opens menu and closes devtools
5. local input handling wins when `event.defaultPrevented === true`

#### `src/app-shell/useRuntimeAutosave.test.tsx`
Must verify with fake timers:
1. autosave fires every 5 seconds in active gameplay
2. autosave does not fire while paused
3. autosave does not fire in devtools
4. autosave does not fire while any shell overlay is open
5. autosave target name is `autosave`

### 18.3 Unit / integration tests

#### `src/app-shell/resolveWorkspaceManifestPath.test.ts`
Must verify:
1. root manifest resolution
2. nested manifest resolution
3. null when absent

#### `src/ui/runtime/ambient/MenuAmbientWanderSystem.test.ts`
Must verify:
1. speed sampling respects min/max bounds
2. default curve heavily favors low speeds and still allows max-range outliers
3. system emits retarget commands only when due
4. system never mutates entities directly

#### `src/ui/runtime/ambient/createMenuAmbientCartridge.test.ts`
Must verify:
1. cartridge contains exactly the required ambient blueprints
2. config is embedded correctly
3. ambient agent uses `menu_ambient_entity`

#### `src/engine/phaser/display/MenuAmbientDisplayDefinition.test.ts`
Must verify:
1. module stack is exactly transform + glyph + pulse
2. background and interaction modules are absent

#### `src/data/schemas/game/config.test.ts`
Must verify:
1. menuAmbient defaults parse successfully
2. invalid speed ranges fail schema validation
3. curve enum rejects unsupported values

---

## 19. Merge Criteria

This phase is complete only when all of the following are true:

1. Main menu uses Atomic UI composition and no longer depends on bespoke hand-styled action buttons.
2. Main menu actions and transitions match the contract in section 6.
3. `Escape` obeys local-input precedence and shell behavior exactly as specified.
4. The top-right menu button exists and behaves correctly in game and devtools.
5. Gameplay bottom bar and floating save widget are not visible under the main menu.
6. Menu background is a dedicated active runtime with configurable ambient behavior.
7. PLAY mounts a cinematic and runs `start.cvs` only after runtime preconditions are satisfied.
8. Autosave runs every 5 seconds only under the contractually valid gameplay conditions.
9. Removed files are fully replaced by the new shell/menu/save architecture; no dead legacy path remains.
10. All new and changed tests pass.

---

## 20. Implementation Order

1. Extract manifest resolver and extend bootstrap state.
2. Add app-shell Zustand store.
3. Add shell command executor.
4. Add shell hotkeys.
5. Make `RuntimeShell` chrome-configurable and remove floating save widget.
6. Add save/load dialog organism and slot molecule.
7. Add main-menu organisms/molecules and replace old menu façade.
8. Add fixed top-right menu access button.
9. Add ambient config schema.
10. Add ambient cartridge, ambient display definition, ambient wander system, and ambient runtime component.
11. Recompose `App.tsx` around the new layers.
12. Add autosave hook.
13. Update and add tests.

This order is mandatory because PLAY flow, ambient runtime, and autosave all depend on the shell state model and manifest resolution being correct first.
