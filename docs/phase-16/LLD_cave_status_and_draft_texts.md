# LLD: Cave status note + draft text system + draft UI atomization

## Scope

This document covers the two requested changes only:

1. Add a sticky cave status note in the runtime HUD, bottom-left, visually matched to the existing runtime clock.
2. Make the runtime draft UI atom-based, add pool-scoped draft texts, show the current draft text above the cards, and make those texts editable in the draft pool editor.

This design is grounded in the uploaded source tree. It does not introduce speculative features outside the request.

---

## Why

### 1) Cave status note

The runtime shell currently renders a bottom-right `RuntimeClock` but has no bottom-left cave status summary. The codebase already has the required raw data:

- cave/world resolution helpers in `ui/runtime/status/caveStatusUtils.ts`
- food and heat on `sys_world.state`
- cave emotional data in `cave.mind.emotions`
- the existing emotion dominance rule embedded in `game/systems/cave/resolveCaveRenderState.ts`

The missing piece is a compact HUD component that formats those existing signals into a sentence and updates with the same low-overhead pattern already used by the clock.

### 2) Draft texts and draft UI atomization

The current runtime draft overlay only knows:

- `sourceLabel`
- `options[]`
- `selectedOptionId`

It does **not** have any concept of per-pool narrative text or cycle-indexed text selection. The serialized `.draft` schema also has no field for draft texts: `DraftPoolBlueprint` only contains `id` and `entries`.

The current runtime draft UI also uses bespoke surface styling (`DraftOverlay.styles.ts`, `DraftCard.styles.ts`) instead of composing the existing UI atoms already present in the repo (`Modal`, `Card`, `Button`, `GameIcon`, `RichText`, `ToolFrame`, `ComponentRow`).

The correct extension point is therefore:

- serialized authoring data on the **draft pool**
- transient currently displayed text on the **runtime draft component**
- pool text editing inside the existing **draft pool editor**

This keeps ownership aligned with the current codebase:

- pool metadata stays with `DraftPoolBlueprint`
- live, currently shown overlay data stays with `DraftComponent`
- runtime behavior continues to resolve from the selected pool inside `TriggerDraftHandler`
- no changes are required to the draft compiler or runtime command payloads

---

## What

### A. Sticky cave status note

Add a new runtime HUD component in the bottom-left corner.

Displayed sentence contract:

- Base prefix is always `Cave is `.
- Physical statuses are derived first:
  - `hungry` when cave food is `<= 0`
  - `cold` when cave heat is `<= 0`
- Emotional status is always appended last and is exactly one of:
  - `happy`
  - `sad`
  - `curious`
  - `scared`
- Joining rule is deterministic English list joining:
  - 1 item: `A`
  - 2 items: `A and B`
  - 3+ items: `A, B, and C`

Examples:

- `Cave is scared`
- `Cave is hungry and sad`
- `Cave is hungry, cold, and scared`

Visual contract:

- same visual chrome and vertical size class as the existing runtime clock
- bottom-left anchor, same bottom offset as the runtime clock
- same z-layer category as the runtime clock
- no interactive controls inside the note

Visibility contract:

- render only in `chrome="full"`
- hide if runtime is absent
- hide if no cave/world entity can be resolved

### B. Draft texts

Add a `texts` list to each `DraftPoolBlueprint`.

Authoring contract:

- texts are owned by the pool, not by individual options and not by the module root
- order is meaningful
- `texts[0]` is `Text #1`
- `texts[1]` is `Text #2`
- etc.
- empty list is valid and means “this pool has no narrative text”

Runtime contract:

- each successful trigger of a given pool increments that pool’s shown-count
- the incremented count becomes the `cycleNumber` for the active draft instance
- the active draft resolves `currentText` as:
  - pool text at index `cycleNumber - 1`
  - if missing, `currentText` is the empty string
- there is **no wraparound**
- there is **no fallback to the last text**
- count increments only when a draft is actually activated (not on failed/empty pool triggers)

Overlay contract:

- if `currentText` is non-empty after trim, show a RichText panel above the option cards
- panel title is exactly `Text #<cycleNumber>`
- if `currentText` is empty after trim, do not render the RichText panel
- option cards still render normally below it

Editor contract:

- draft pool editor becomes the authoritative editor for `draftPools.<poolId>.texts`
- each text row is displayed as `Text #<1-based index>`
- each row contains:
  - editable raw text area
  - live RichText preview rendered from the same local edit buffer
  - remove action for that row
- `Add Text` appends a new empty string to the end of the pool’s `texts` array
- removing a text compacts the array and renumbers the visible `Text #` labels by new array index

### C. Draft UI atomization

The runtime draft overlay must stop owning custom surface look-and-feel.

Required composition:

- `Modal` remains the overlay container
- `Card` becomes the visual surface for:
  - the overlay body
  - the draft text panel
  - each draft option card shell
- `Button` is used for the actual choose/select action
- `GameIcon` remains the icon renderer
- `RichText` renders the draft text panel content and draft option description content

Allowed local styles:

- layout only (grid, stack, spacing, width constraints, alignment)

Disallowed local styles in the draft runtime UI:

- custom card chrome
- custom hover chrome
- custom badge chrome
- custom modal body surface styling that duplicates atom behavior

This keeps the look aligned with the existing atom library and prevents a second visual system from growing inside the draft runtime UI.

---

## How

## Design decisions that intentionally reuse existing code

1. **No draft command schema changes**
   - `TriggerDraftCommandPayload`, `BehaviorSystem`, `DraftAbilitySchema`, and `draftCompiler` do not need to change.
   - Rationale: text belongs to the selected pool and can be resolved inside `TriggerDraftHandler` from the already available `poolId`.

2. **Pool-scoped text storage**
   - `texts` is added to `DraftPoolBlueprint`, not to options.
   - Rationale: the request says “draft texts per draft”, and the existing runtime trigger path is pool-driven.

3. **Transient runtime text on `DraftComponent`**
   - active overlay state stores `cycleNumber` and `currentText`.
   - Rationale: the runtime overlay already consumes denormalized draft data from `sys_world.draft`; reusing that pattern avoids reaching back into module authoring data from the runtime UI.

4. **Per-pool shown counts persist alongside existing one-off history**
   - `shownCountsByPool` is stored next to `pickedOneOffs` on the world draft component and preserved by `clearDraftComponent`.
   - Rationale: the current code already preserves one-off history through the same mechanism.

5. **Emotion label precedence is extracted from the existing cave render rule**
   - a shared helper is introduced so the HUD note and the cave render system use one source of truth for emotion dominance.

6. **Pool editor remains the only draft text editor**
   - no new shell route is introduced.
   - Rationale: texts are pool metadata; the existing pool editor is the correct ownership boundary.

---

## File-by-file design

## 1) `data/schemas/draft.ts` (change)

### Responsibility
Canonical serialized schema for draft option and draft pool authoring data.

### Logic
Extend `DraftPoolBlueprintSchema` with a new field:

- `texts: z.array(z.string()).default([])`

### Interface / contract
`DraftPoolBlueprint` becomes:

- `id: string`
- `entries: DraftPoolEntry[]`
- `texts: string[]`

### Notes
- This is backward compatible for existing `.draft` files because omitted `texts` parse to `[]`.
- No other schema in the draft command path changes.

---

## 2) `engine/runtime/components/DraftComponent.ts` (change)

### Responsibility
Transient runtime state for the currently active draft overlay plus persisted draft history that must survive `CLEAR_DRAFT`.

### Logic
Add fields:

- `cycleNumber: number`
- `currentText: string`
- `shownCountsByPool: Record<string, number>`

### Interface / contract
Active draft instance fields:

- `active: boolean`
- `poolId: string`
- `triggerEntityId: string`
- `options: DraftOptionBlueprint[]`
- `sourceLabel: string`
- `selectedOptionId?: string | null`
- `pickedOneOffs: string[]`
- `shownCountsByPool: Record<string, number>`
- `cycleNumber: number`
- `currentText: string`

Inactive/default contract:

- `active = false`
- `cycleNumber = 0`
- `currentText = ""`
- `shownCountsByPool` is preserved across clear
- `pickedOneOffs` is preserved across clear

---

## 3) `game/handlers/draftUtils.ts` (change)

### Responsibility
Shared pure helpers for runtime draft state mutation and draft lifecycle defaults.

### Logic
Add pure helpers for:

- resolving next shown count for a pool
- returning the updated `shownCountsByPool` map
- resolving `currentText` from `texts[]` and `cycleNumber`
- preserving `shownCountsByPool` in `clearDraftComponent`

`clearDraftComponent` must now reset transient display state while preserving history state.

### Interface / contract
New helper contracts:

- `nextCycleNumber = previousShownCount(poolId) + 1`
- `currentText = texts[nextCycleNumber - 1] ?? ""`

`clearDraftComponent(world)` contract:

- preserves `pickedOneOffs`
- preserves `shownCountsByPool`
- resets `cycleNumber` to `0`
- resets `currentText` to `""`

---

## 4) `game/handlers/TriggerDraftHandler.ts` (change)

### Responsibility
Activate a runtime draft from a pool.

### Logic
After entry filtering and option selection succeed:

1. read existing draft component from `sys_world`
2. compute `nextCycleNumber` for `command.payload.poolId`
3. resolve `currentText` from the selected pool’s `texts`
4. write the new active `DraftComponent`

Important ordering contract:

- shown count increments only after the handler has confirmed there is at least one selectable option
- failed triggers do not mutate shown counts

### Interface / contract
No command payload changes.

Input remains:

- `poolId`
- `triggerEntityId`
- `count?`
- `label?`

Output `DraftComponent` now additionally includes:

- `cycleNumber`
- `currentText`
- updated `shownCountsByPool`

---

## 5) `game/systems/cave/resolveDominantCaveEmotion.ts` (new)

### Responsibility
Single source of truth for the cave’s dominant emotional label.

### Logic
Implements the same precedence already embedded in `resolveCaveRenderState`:

1. if terror is the strongest (ties included), result is `scared`
2. else if sadness is at least as strong as happiness and curiosity, result is `sad`
3. else if happiness is at least as strong as curiosity, result is `happy`
4. else result is `curious`

### Interface / contract
Input:

- `CaveEmotions`

Output:

- one of `happy | sad | curious | scared`

### Notes
This is intentionally deterministic and intentionally preserves the current tie behavior from the existing render system.

---

## 6) `game/systems/cave/resolveCaveRenderState.ts` (change)

### Responsibility
Resolve render-only eye state from cave attention and emotions.

### Logic
Replace the in-file emotion dominance logic with the shared helper from `resolveDominantCaveEmotion.ts`.

Render mapping contract:

- `scared` -> `eyeShape = scared`
- `sad` -> `eyeShape = unhappy`
- `happy` -> `eyeShape = happy`
- `curious` ->
  - `anticipating` when `focusStrength >= 0.45`
  - otherwise `neutral`

### Interface / contract
Public function signature remains unchanged.

### Notes
This refactor is required so the status note and the cave eye renderer do not diverge.

---

## 7) `ui/runtime/status/caveStatusUtils.ts` (change)

### Responsibility
Pure runtime HUD helpers for cave status extraction and text formatting.

### Logic
Add UI-facing helpers for:

- reading cave food value
- reading cave heat value
- resolving the cave emotional label via the shared game helper
- formatting the final sentence using deterministic English list joining

### Interface / contract
New helper contracts:

- `resolveCaveStatusParts(entity) -> string[]`
  - includes `hungry` when `food <= 0`
  - includes `cold` when `heat <= 0`
  - always appends exactly one emotional label last
- `formatCaveStatusSentence(parts) -> string`
  - joins with `and` / Oxford comma rules
  - prefixes with `Cave is `

Visibility helper contract:

- if no cave entity is resolvable, return `null`

---

## 8) `ui/runtime/status/RuntimeStatusStrip.styles.ts` (new)

### Responsibility
Shared status-strip chrome for bottom-corner runtime HUD elements.

### Logic
Provide shared style primitives for:

- bottom-left anchor
- bottom-right anchor
- shared strip surface matching the current clock

### Interface / contract
Exports layout/chrome primitives only.

It must not own component logic.

### Notes
This prevents the cave status note and runtime clock from visually drifting over time.

---

## 9) `ui/runtime/status/RuntimeClock.tsx` (change)

### Responsibility
Bottom-right runtime clock and controls.

### Logic
No behavioral change.

It only switches to the shared status-strip primitives from `RuntimeStatusStrip.styles.ts`.

### Interface / contract
Public behavior is unchanged.

---

## 10) `ui/runtime/status/CaveStatusNote.tsx` (new)

### Responsibility
Bottom-left runtime HUD note that shows `Cave is ...`.

### Logic
Implementation pattern must match the existing `RuntimeClock` update strategy:

- use the runtime from store/context
- use animation-frame polling with imperative text updates
- avoid React re-rendering every tick

Rendering contract:

- `aria-label = "Cave status note"`
- no controls
- no tooltip dependency
- no click behavior
- rendered inside the shared strip surface

Text contract:

- updates when cave food, heat, or emotion changes
- hidden when no cave entity is available

---

## 11) `ui/runtime/shell/RuntimeShellCanvas.tsx` (change)

### Responsibility
Compose runtime overlay layers.

### Logic
Insert `CaveStatusNote` into the `chrome === "full"` branch.

### Interface / contract
Ordering contract:

- `CaveStatusNote` is rendered in the same full-chrome branch as `RuntimeClock`
- it does not render in `minimal` chrome

---

## 12) `ui/runtime/draft/useDraftState.ts` (change)

### Responsibility
React-facing selector and action wrapper for the live runtime draft component.

### Logic
Extend the selector comparison key so overlay rerenders when the displayed text or cycle number changes.

### Interface / contract
`getDraftKey(...)` must now include:

- `cycleNumber`
- `currentText`

This is required so two drafts with the same options and same label but different text still update the UI.

---

## 13) `ui/runtime/draft/DraftOverlay.tsx` (change)

### Responsibility
Runtime modal that presents the active draft.

### Logic
The overlay is restructured into atom composition:

- outer surface: `Modal`
- inner container surface: `Card`
- optional narrative panel surface: `Card`
- narrative renderer: `RichText`
- option list container: grid layout only

Rendering order:

1. overlay title (`sourceLabel` or `Draft`)
2. optional text panel (`Text #<cycleNumber>` + `RichText(currentText)`)
3. option cards

### Interface / contract
Text panel contract:

- render only when `draft.currentText.trim().length > 0`
- title text is exactly `Text #${draft.cycleNumber}`

Behavior contract:

- existing pause-on-open behavior is preserved
- existing option selection flow is preserved

---

## 14) `ui/runtime/draft/DraftOverlay.styles.ts` (change)

### Responsibility
Layout-only primitives for the draft overlay.

### Logic
Reduce this file to layout concerns only:

- overlay width constraint
- stack spacing
- grid spacing / columns

### Interface / contract
This file must **not** define:

- surface backgrounds
- borders
- radii
- typography
- hover chrome

Those come from atoms.

---

## 15) `ui/runtime/draft/DraftCard.tsx` (change)

### Responsibility
Single draft option presentation and selection UI.

### Logic
Rebuild as atom composition:

- shell: `Card`
- icon: `GameIcon`
- description: `RichText`
- choose action: `Button`

Interaction contract:

- selecting an option still invokes `onSelect()` exactly once
- there is one primary choose action per card
- no custom button-surface styling remains in this component

### Interface / contract
Props remain conceptually the same:

- `title`
- `description`
- `icon`
- `rarity`
- `onSelect`

Rarity contract:

- `none` shows no rarity label
- other rarity values show existing text labels only; visual treatment uses atom-compatible layout and theme tokens

### Notes
`RichText` on descriptions is intentional: it reuses the existing atom and gives description text the same formatting capabilities as the new narrative panel.

---

## 16) `ui/runtime/draft/DraftCard.styles.ts` (change)

### Responsibility
Layout-only wrappers used by the atom-based `DraftCard`.

### Logic
Retain only minimal layout primitives if needed, such as:

- vertical stack spacing
- header alignment
- icon alignment

### Interface / contract
This file must not own visual chrome.

---

## 17) `ui/devtools/editors/draft/pools/useDraftPoolEditor.ts` (change)

### Responsibility
Authoring view-model for a single draft pool.

### Logic
Extend the view-model with text editing support:

- `texts: string[]`
- `addText(): void`
- `removeText(index: number): void`

Mutation contract:

- `addText` appends `""` to `draftPools.<poolId>.texts`
- `removeText(index)` removes exactly that array element
- array order is preserved for remaining texts

### Interface / contract
Returned view-state now includes both entry editing and text editing concerns.

No route, filename, or loading contract changes.

---

## 18) `ui/devtools/editors/draft/pools/DraftTextRow.tsx` (new)

### Responsibility
Edit one pool text and preview it as rich text.

### Logic
For a given `filename`, `poolId`, and `index`:

- bind raw text to `draftPools.<poolId>.texts.<index>`
- use the same local edit buffer pattern as `useStringField`
- render a live RichText preview from the local buffer
- expose remove action for that row

### Interface / contract
Props:

- `filename: string`
- `poolId: string`
- `index: number`
- `onRemove: () => void`

Visible contract:

- row title is `Text #<index + 1>`
- row summary is the first non-empty line trimmed, else `Empty`
- preview always reflects the local edit buffer, not only committed session state

### Notes
This file should compose existing primitives (`ComponentRow`, `Card`, `RichText`, existing field styles/hooks) instead of introducing a new editor visual system.

---

## 19) `ui/devtools/editors/draft/pools/DraftPoolEditor.tsx` (change)

### Responsibility
Authoring screen for one draft pool.

### Logic
Add a new `Draft Texts` section before the existing distribution/entry list.

Section contract:

- section header text: `Draft Texts`
- section action button: `Add Text`
- text rows render in current array order using `DraftTextRow`
- empty state text when `texts.length === 0`: `No draft texts yet.`

The existing distribution bar and entry list remain unchanged and stay below the text section.

### Interface / contract
The editor remains a single pool screen; no navigation or routing changes are introduced.

---

## Files intentionally unchanged

These files remain unchanged by design:

- `data/schemas/abilities/draft.ts`
- `engine/runtime/types/runtimeCommandPayloadsDraft.ts`
- `engine/runtime/systems/BehaviorSystem.ts`
- `engine/compiler/abilities/draftCompiler.ts`
- `ui/devtools/editors/draft/DraftPackEditor.tsx`
- shell routing / virtual-path files

### Why they stay unchanged

- authoring text is pool metadata, so it does not need a new runtime command field
- runtime text resolution already has `poolId` inside `TriggerDraftHandler`
- no new top-level editor route is necessary because pool editor is the authoritative owner of pool metadata

---

## Test design

## 20) `game/systems/cave/resolveDominantCaveEmotion.test.ts` (new)

### Responsibility
Lock the shared emotion precedence contract.

### Cases
- terror strongest -> `scared`
- sadness stronger than happiness/curiosity -> `sad`
- happiness >= curiosity -> `happy`
- curiosity strongest -> `curious`
- tie cases preserve the existing precedence order

---

## 21) `ui/runtime/status/CaveStatusNote.test.tsx` (new)

### Responsibility
Verify HUD rendering and sentence formatting at component level.

### Cases
- hidden when runtime/cave missing
- `food <= 0` adds `hungry`
- `heat <= 0` adds `cold`
- no physical deficits shows only emotional label
- combined statuses render with deterministic join rules

---

## 22) `ui/runtime/shell/RuntimeShell.test.tsx` (change)

### Responsibility
Verify shell chrome composition.

### Cases
- status note is absent in minimal chrome
- status note is present in full chrome
- runtime clock behavior remains unchanged

---

## 23) `game/handlers/TriggerDraftHandler.texts.test.ts` (new)

### Responsibility
Verify draft cycle counting and text resolution.

### Cases
- first successful trigger of pool uses `cycleNumber = 1` and `texts[0]`
- second successful trigger of same pool uses `cycleNumber = 2` and `texts[1]`
- missing `texts[cycleNumber - 1]` yields empty `currentText`
- failed trigger does not increment `shownCountsByPool`
- counts are tracked independently per pool id

---

## 24) `ui/runtime/draft/DraftOverlay.test.tsx` (change)

### Responsibility
Verify runtime draft overlay rendering contract.

### Cases
- text panel renders above cards when `currentText` is non-empty
- text panel title is `Text #<cycleNumber>`
- text panel is absent when `currentText` is empty
- option cards still render when text is absent
- existing rarity suppression for `none` remains intact

---

## 25) `ui/devtools/editors/draft/pools/DraftPoolEditor.test.tsx` (change)

### Responsibility
Verify draft text authoring behavior in the pool editor.

### Cases
- existing distribution/weight behavior remains intact
- existing one-off toggle behavior remains intact
- `Add Text` appends a new empty text row
- editing a text row updates `draftPools.<poolId>.texts[index]` in session state
- removing a row compacts the array
- rendered row labels renumber after removal

---

## Acceptance criteria

This design is complete only when all of the following are true:

1. The runtime full chrome shows a bottom-left note with the same strip chrome class as the clock and the text follows the exact sentence contract above.
2. `.draft` pool data supports `texts[]` with backward-compatible defaulting.
3. Every successful draft activation records a deterministic `cycleNumber` per pool and resolves `currentText` from the pool text list without command-schema changes.
4. The runtime draft overlay shows `Text #<cycleNumber>` and the RichText panel above the option cards when text exists.
5. The draft pool editor is the authoritative place to create, edit, preview, and remove pool texts.
6. The draft runtime UI surface styling is atom-owned; local draft styles are layout-only.
7. The tests listed above pass against the stated contracts.

---

## Out of scope

The following are intentionally not part of this design:

- text wraparound or fallback-to-last-text behavior
- text localization
- per-option narrative text
- new shell routes for text editing
- changes to draft ability authoring schema or runtime command payloads
- changes to how options are selected or resolved

