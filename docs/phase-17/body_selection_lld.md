# LLD — Body identity, body lens, swarm tooltip, avatar bridge, and selection-folder reorganization

## 1. Scope

This document defines the implementation for the following requested changes:

1. Move swarm attribute rendering into a shared React component named `AttributesList`.
2. Reuse `AttributesList` in `SwarmCard`, `SwarmRowItem`, and the new body card.
3. Split body/proxy selection from face selection so proxies render a body card, not a face card.
4. Add a body card for direct bodies and proxies.
5. Show body-card content inside a `SmartTooltip` when a swarm row is hovered.
6. Generate and persist body identity at first spawn: name, gender, and family-name parts.
7. Reuse the existing avatar system for permanence, and expose avatar imagery to React without duplicating gameplay state.
8. Expose body XP and level in a dedicated component, with the same presentation pattern used for cave XP/level.
9. Reorganize `ui/runtime/world/selection` so each lens has its own folder.

This design is constrained by the project contract and context pack:

- UI renders only; logic stays in hooks, services, or pure helpers.
- Runtime state remains in ECS.
- Mutations happen through existing command/apply paths or at spawn time where the current code already initializes body data.
- Tests must follow the existing unit/integration/view split and Given/When/Then style.

## 2. Existing code facts the design must respect

1. `selectionLensMap.ts` currently routes direct bodies, faces, and proxies to `FaceCard`.
2. `SwarmCard.tsx` and `SwarmRowItem.tsx` both render attributes inline today.
3. `FaceCard.tsx` already composes `ModifierList` and `TraitList` and reads live body state through selectors/hooks.
4. `body.passport` already exists and already persists with the body; it currently stores `name`, `description`, `portraitIcon`, and `glyphKey`.
5. Proxy display already forces bodies to `body_avatar`, and avatar permanence across body/proxy/face already follows `proxy.originalId` / face assignment / entity id through `resolveAvatarSubjectSeed`.
6. Spawn-time body naming currently exists only as `assignSerialBodyName`, which allocates `sys_world.state.bodySerial` but only fills the name when the current name is exactly `"Unknown"`.
7. Existing saved bodies in the repo contain blank passport names, not `"Unknown"`; therefore blank-name handling is required.
8. React currently has no access path to Phaser avatar textures.
9. `ui/runtime/draft/DraftCard.styles.ts` already exports `CardBody`; therefore the new body-card content component must **not** use the name `CardBody`.

## 3. Why this design

### 3.1 Why split body/proxy from face

A face and a body are different selections.

- A face is an attribute slot that may or may not have an assigned body.
- A body or proxy is a concrete entity whose card must show that body’s own permanent identity, progression, attributes, modifiers, and traits.

Keeping proxies on `FaceCard` is wrong because it hides the body’s actual identity and presents the proxy as if it were a face slot.

### 3.2 Why keep identity in `body.passport`

`body.passport` already persists with the body and survives all role changes because proxies point back to the original body and selection hooks already resolve through body ids. Reusing `passport` avoids introducing shadow identity state in React or in parallel ECS components.

### 3.3 Why keep avatar permanence derived, not duplicated

The existing avatar pipeline is already deterministic for a body subject:

- direct body → body entity id
- proxy → `proxy.originalId`
- face → assigned body id

That is already the correct permanence model. The missing piece is only React access to the rendered avatar imagery.

### 3.4 Why add a small Phaser→React bridge

React cannot render Phaser texture keys directly. The design therefore exposes **renderable image sources** from the active scene through a narrow bridge. This reuses the existing avatar registry and texture manager and does not duplicate avatar state in ECS.

## 4. Non-goals

1. No gameplay rebalance.
2. No changes to cave mechanics, proxy dispatch mechanics, face assignment mechanics, or avatar generation rules.
3. No replacement of the existing avatar renderer.
4. No new generalized UI framework beyond the exact shared components required here.
5. No refactor outside the files listed below.

## 5. Data model changes

## 5.1 `body.passport`

`passport` remains the canonical identity container.

### New persisted fields

- `identitySerial: number`
  - One-time, stable allocation per body.
  - Allocated from `sys_world.state.bodySerial`.
  - Never changes after first assignment.
- `gender: "male" | "female"`
  - Generated once for placeholder bodies.
- `givenName: string`
  - Generated once for placeholder bodies.
- `familyRoot: string`
  - Generated once for placeholder bodies.
- `familySuffix: string`
  - Generated once for placeholder bodies.
- `familyName: string`
  - Derived once as `familyRoot + familySuffix`.

### Existing fields retained unchanged

- `name: string`
  - Remains the canonical display name used by existing selectors.
  - For generated identities this becomes `"<givenName> <familyName>"`.
- `description?: string`
- `portraitIcon?: string`
- `glyphKey?: string`

### Initialization rule

A passport is treated as needing generated identity when `passport.name` is:

- missing
- blank after trim
- exactly `"Unknown"`

### Preservation rule

If `passport.name` is already non-blank and not `"Unknown"`, the implementation must preserve the authored name and must not overwrite it with a generated name.

## 5.2 `sys_world.state.bodySerial`

The existing `bodySerial` state key is retained and reused.

### Meaning

- It is the monotonic allocator for `passport.identitySerial`.
- It is incremented only when a body missing `identitySerial` is initialized.

## 6. Runtime behavior

## 6.1 Spawn path

At body spawn:

1. Clone blueprint state exactly as today.
2. If the spawned entity has a body component and is not `sys_swarm`, call the new body-identity initializer.
3. The initializer must:
   - allocate `passport.identitySerial` if missing
   - preserve `portraitIcon` and `glyphKey`
   - generate `gender`, `givenName`, `familyRoot`, `familySuffix`, `familyName`, and `name` only when the passport currently has a placeholder name
4. Add the entity to the world exactly as today.

## 6.2 Legacy-save backfill path

Because current saved bodies in the repo have blank names, the implementation must also backfill missing identity on normal body updates.

### Rule

During normal body-system ticks:

- read the current `sys_world.state.bodySerial` into a local allocator value
- for each body missing `identitySerial`, allocate the next serial from that local allocator
- for each body with a placeholder passport name, generate a passport patch for the current serial
- merge that passport patch into the same `UPDATE_BODIES_BATCH` payload that already carries progression/attribute updates
- if the allocator value changed, emit a single `UPDATE_STATE` command to persist the new `sys_world.state.bodySerial`

This is not a second identity system. It is only a compatibility backfill for bodies that already exist before the new spawn initializer is available.

## 6.3 Avatar permanence

No new ECS avatar field is added.

Permanence continues to use the existing subject resolution:

- selected body → selected body id
- selected proxy → `proxy.originalId`
- face → assigned body id
- swarm avatar → existing swarm slot behavior remains unchanged

## 7. UI behavior

## 7.1 Lens routing

### New routing rules

- `FaceCard` matches **faces only**.
- `BodyCard` matches:
  - direct body entities
  - proxy entities
- `SwarmCard`, `CaveCard`, `TransferCard`, `JobCard`, `AttributePoolCard`, and `ResourceCard` keep their current matching behavior.

### Body target rule

For body-card data:

- if the selected entity is a direct body, target id = `entity.id`
- if the selected entity is a proxy, target id = `entity.proxy.originalId`

All live selectors, modifiers, and traits for `BodyCard` must read from the resolved target body id, never from the proxy shell.

## 7.2 `AttributesList`

`AttributesList` becomes the shared renderer for body/mind/social values.

### Responsibilities

- Render exactly three attributes: body, mind, social.
- Render only the values it is given.
- Perform no selection or aggregation logic.

### Modes

- `section`
  - Used by `SwarmCard` totals and `BodyCard`.
  - Styled to match the current visual pattern of `CaveCapabilitiesSection`.
- `inline`
  - Used by `SwarmRowItem`.
  - Compact row presentation only.

### Explicit non-responsibilities

- It does not calculate totals.
- It does not know about cave comfort.
- It does not inspect runtime state directly.

## 7.3 `BodyCard`

`BodyCard` is the selection card for direct bodies and proxies.

### Required content order

1. `BodyIdentity`
2. narrative/description text from the resolved entity description
3. `BodyXpAndLevel`
4. health row and health bar
5. `AttributesList` in `section` mode
6. `ModifierList`
7. `TraitList`

### Data source

- Identity, XP, level, health, attributes, modifiers, and traits come from the resolved target body id.
- Description comes from the resolved target entity when available; otherwise from the selected entity.

## 7.4 `BodyCardContent`

This is the inner content renderer for body-card UI.

### Reason it exists

`SmartTooltip` already wraps tooltip content in a `Card`. Reusing the full `BodyCard` inside the tooltip would create an unnecessary nested card. `BodyCardContent` avoids that.

### Rule

- `BodyCard` = `SelectionCardRoot` + `BodyCardContent`
- swarm-row tooltip = `SmartTooltip(content=<BodyCardContent ... />)`

## 7.5 Swarm-row tooltip

Hovering a swarm row opens a `SmartTooltip` containing `BodyCardContent` for that row’s body id.

### Hover target

The tooltip trigger is the full `SwarmRow` root.

### Tooltip content source

The tooltip body uses the same resolved body data as the full `BodyCard`.

## 7.6 `BodyIdentity`

`BodyIdentity` is the permanent identifier renderer for a body.

### Required output

- avatar image/layers on the left
- display name on the right
- gender is **not** displayed

### Data source

- avatar subject id = resolved body target id
- display name = `passport.name` if non-blank; otherwise fallback label rules

## 7.7 `BodyXpAndLevel`

`BodyXpAndLevel` is the dedicated XP/level component for bodies.

### Required output

- XP text: `[current xp / xp to next level]`
- level text: `[current level]`
- no progress bar
- use the same compact stat presentation pattern as current cave XP/level

## 8. Folder organization

The selection tree must be reorganized so that each lens owns its own files.

## 8.1 Final selection folder shape

`ui/runtime/world/selection/`

- `body/`
- `cave/`
- `face/`
- `swarm/`
- `job-card/` (already lens-scoped)
- `absorption/` (already lens-scoped)
- `components/` (shared render-only parts)
- root files that remain root-level because they are cross-lens infrastructure:
  - `selectionLensMap.ts`
  - `selectionTypes.ts`
  - `selectionUtils/**`
  - `entityAnalysis/**`
  - `useEntitySelector.ts`

## 9. File-by-file design

## 9.1 Runtime/data layer

### 1. `src/data/schemas/game/body.ts` — change

**Responsibility**

Extend the persisted passport schema for generated body identity.

**Logic**

Add the new optional passport fields described in section 5.1.

**Interface**

`PassportSchema` must expose:

- existing fields: `name`, `description`, `portraitIcon`, `glyphKey`
- new fields: `identitySerial`, `gender`, `givenName`, `familyRoot`, `familySuffix`, `familyName`

`BodyComponent` continues to contain `passport` under `body.passport`.

---

### 2. `src/lib/body-identity/bodyIdentityCatalog.ts` — add

**Responsibility**

Expose the static source lists used for identity generation.

**Logic**

This file contains only data exports:

- `maleFirstNames`
- `femaleFirstNames`
- `familyRoots`
- `familySuffixes`

**Interface**

Export a single catalog object with four arrays, plus explicit types if needed.

**Notes**

The standalone attached data file `body_identity_name_catalog.json` is the authoritative content for these lists.

---

### 3. `src/lib/body-identity/bodyIdentityGenerator.ts` — add

**Responsibility**

Pure deterministic generation of body identity fields.

**Logic**

Inputs:

- `identitySerial: number`
- `passport: current passport record`
- `catalog: name catalog`

Rules:

1. Do not mutate inputs.
2. Preserve authored names.
3. Generate only when `passport.name` is placeholder.
4. Preserve `portraitIcon` and `glyphKey`.
5. Use deterministic seeded selection; no `Math.random`.

Generation steps:

1. Determine gender from deterministic seed based on `identitySerial`.
2. Select first name from the gender-specific list.
3. Select family root from `familyRoots`.
4. Select family suffix from `familySuffixes`.
5. Build `familyName = familyRoot + familySuffix`.
6. Build `name = givenName + " " + familyName`.

**Interface**

Input contract:

- `generateBodyIdentity(identitySerial, passport, catalog)`

Output contract:

- returns `null` when no generated patch is needed
- otherwise returns a partial passport patch containing:
  - `gender`
  - `givenName`
  - `familyRoot`
  - `familySuffix`
  - `familyName`
  - `name`

---

### 4. `src/lib/body-identity/bodyIdentityGenerator.test.ts` — add

**Responsibility**

Unit tests for deterministic identity generation.

**Logic to verify**

- same serial always yields the same output
- placeholder name generates a full identity patch
- authored non-placeholder name yields `null`
- generated family name is exactly `root + suffix`
- generated gender is always one of `male` / `female`
- blank and `"Unknown"` are both treated as placeholders

**Interface**

Pure unit tests only. No DOM. No runtime world.

---

### 5. `src/engine/runtime/handlers/spawnBodyIdentity.ts` — add

**Responsibility**

Spawn-time initializer for body identity.

**Logic**

Inputs:

- body record
- entity id
- handler context

Steps:

1. Ensure `body.passport` exists.
2. Read `sys_world.state.bodySerial`; if missing, treat as `0`.
3. If `passport.identitySerial` is missing:
   - increment `bodySerial`
   - write the incremented value back to `sys_world.state.bodySerial`
   - persist the same number into `passport.identitySerial`
4. Run `bodyIdentityGenerator`.
5. Apply the returned passport patch directly to the spawned body if a patch exists.

**Interface**

`ensureSpawnedBodyIdentity(body, entityId, context): void`

**Failure handling**

If `sys_world` is missing, log loudly through telemetry and do not throw.

---

### 6. `src/engine/runtime/handlers/spawnBodySerial.ts` — remove

**Responsibility after change**

None. This file is replaced entirely by `spawnBodyIdentity.ts`.

---

### 7. `src/engine/runtime/handlers/SpawnHandler.ts` — change

**Responsibility**

Use the new spawn-time identity initializer for body entities.

**Logic**

Replace the `assignSerialBodyName` call with `ensureSpawnedBodyIdentity`.

**Interface**

No interface change to `SpawnHandler.handle`.

---

### 8. `src/game/handlers/spawnFromBlueprint.ts` — change

**Responsibility**

Apply the same identity initialization path used by `SpawnHandler`.

**Logic**

Replace `assignSerialBodyName` with `ensureSpawnedBodyIdentity`.

**Interface**

No interface change to `spawnFromBlueprint`.

---

### 9. `src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts` — change

**Responsibility**

Allow body update batches to carry passport identity patches for legacy-save backfill.

**Logic**

Extend `BodyUpdatePayload` with optional `passport` patch data.

**Interface**

`BodyUpdatePayload` gains:

- `passport?: Partial<Passport>`

The allowed keys in the patch are only the passport keys defined in `body.ts`.

---

### 10. `src/game/handlers/UpdateBodiesBatchHandler.ts` — change

**Responsibility**

Merge passport patches into existing body passports.

**Logic**

When `update.passport` exists:

1. Ensure `body.passport` exists.
2. Merge the provided keys onto the existing passport.
3. Do not delete existing passport keys that are not part of the patch.

**Interface**

No change to handler entrypoint.

---

### 11. `src/game/systems/body/identityBackfill.ts` — add

**Responsibility**

Pure helper for legacy-save passport backfill during body-system ticks.

**Logic**

Inputs:

- current body
- local `nextIdentitySerial` allocator value
- name catalog

Steps:

1. If `passport.identitySerial` is missing, reserve `nextIdentitySerial + 1` and include it in the passport patch.
2. Determine the effective serial for this body:
   - existing `passport.identitySerial` when present
   - otherwise the newly reserved serial
3. If the passport has a placeholder name, call `bodyIdentityGenerator` with the effective serial and include the returned identity fields in the passport patch.
4. Return both:
   - `passportPatch | null`
   - `nextIdentitySerial` after any reservation

**Interface**

`resolveBodyIdentityBackfill(body, nextIdentitySerial, catalog)` returns:

- `passportPatch: Partial<Passport> | null`
- `nextIdentitySerial: number`

---

### 12. `src/game/systems/body/updatePayload.ts` — change

**Responsibility**

Allow normal body updates to carry an optional passport patch produced elsewhere.

**Logic**

- keep progression and attribute diffing exactly as today
- accept an optional `passportPatch` input
- when that patch is non-null, attach it to `payload.passport`

**Interface**

`buildBodyUpdatePayload` gains an optional passport-patch argument.

**Important rule**

This file must not allocate serials or generate identity itself. It only assembles the final payload.

---

### 13. `src/game/systems/BodySystem.ts` — change

**Responsibility**

Coordinate legacy identity backfill during normal body ticks.

**Logic**

1. Read the current `sys_world.state.bodySerial` into a local allocator value before iterating bodies.
2. For each body entity:
   - run the existing progression logic
   - run `resolveBodyIdentityBackfill`
   - pass any returned passport patch into `buildBodyUpdatePayload`
3. After the loop:
   - if the local allocator increased, enqueue one `UPDATE_STATE` command for `sys_world.bodySerial`
   - if any bodies changed, enqueue one `UPDATE_BODIES_BATCH` command exactly as today

**Interface**

No public constructor change.

---

### 14. `src/game/systems/BodySystem.identity.test.ts` — add

**Responsibility**

Integration coverage for legacy-save backfill via the ECS update path.

**Logic to verify**

- blank-name body gets a passport patch on first tick
- authored named body is not overwritten
- `identitySerial` allocation occurs exactly once
- update batch merges passport identity without disturbing existing `portraitIcon`/`glyphKey`

**Interface**

Use a real world and real `BodySystem` per the test contract.

## 9.2 Phaser avatar bridge

### 15. `src/engine/phaser/avatar/bodyAvatarBridge.ts` — add

**Responsibility**

Minimal singleton bridge between the active Phaser scene and React.

**Logic**

Store one active resolver function.

**Interface**

- `registerBodyAvatarResolver(resolver)`
- `clearBodyAvatarResolver()`
- `resolveBodyAvatarPresentation(subjectId)`

Return type:

- `BodyAvatarPresentation | null`

`BodyAvatarPresentation` contains only React-renderable values:

- `appearanceKey: string`
- `glowSrc: string`
- `silhouetteSrc: string`
- `eyesSrc: string`

No Phaser objects are returned to React.

---

### 16. `src/engine/phaser/avatar/resolveBodyAvatarPresentation.ts` — add

**Responsibility**

Resolve avatar imagery for a body subject id using the active scene’s avatar registry and texture manager.

**Logic**

Inputs:

- subject id
- texture manager
- avatar registry
- scene texture store access

Steps:

1. Resolve `AvatarAppearance` from `avatarRegistry.resolve(subjectId)`.
2. Materialize the three textures through `textureManager`:
   - glow
   - silhouette
   - eyes
3. Read the generated texture sources from Phaser.
4. Convert each source to a React-renderable string source:
   - if the source is an image element, use its `src`
   - if the source is a canvas element, use `toDataURL()`
5. Cache by `appearanceKey` so repeated React reads do not re-encode the same avatar every frame.

**Interface**

`resolveBodyAvatarPresentation(subjectId, textureManager, avatarRegistry, scene): BodyAvatarPresentation | null`

**Failure handling**

- return `null` when textures are unavailable
- never throw into React

---

### 17. `src/engine/phaser/scenes/GameScene.ts` — change

**Responsibility**

Register the avatar resolver when the scene becomes ready.

**Logic**

After `displaySystem` and `textureManager` are created, register a resolver that delegates to `resolveBodyAvatarPresentation`.

**Interface**

No public constructor change.

---

### 18. `src/engine/phaser/scenes/GameScene.cleanup.ts` — change

**Responsibility**

Clear the avatar resolver when the scene is destroyed.

**Logic**

Call `clearBodyAvatarResolver()` during scene cleanup before tearing down display resources.

**Interface**

No exported signature change.

## 9.3 React avatar usage

### 19. `src/ui/runtime/world/body-avatar/useBodyAvatarPresentation.ts` — add

**Responsibility**

React hook for avatar presentation lookup.

**Logic**

Input:

- `subjectId: string | undefined`

Behavior:

1. If no subject id, return `null`.
2. Read immediately from `bodyAvatarBridge`.
3. If bridge returns `null`, retry on animation frames until either:
   - a presentation is available, or
   - the component unmounts
4. Stop retrying once a non-null presentation is returned.

**Interface**

`useBodyAvatarPresentation(subjectId): BodyAvatarPresentation | null`

---

### 20. `src/ui/runtime/world/selection/body/BodyAvatar.tsx` — add

**Responsibility**

Render the body avatar in React.

**Logic**

Inputs:

- `subjectId`
- fallback icon id
- display size

Behavior:

1. Use `useBodyAvatarPresentation(subjectId)`.
2. If presentation exists, render the three layers in order:
   - glow
   - silhouette
   - eyes
3. If no presentation exists, render `GameIcon` using `portraitIcon` fallback; if no portrait icon exists, use `unknown`.

**Interface**

`BodyAvatar` props:

- `subjectId: string | undefined`
- `fallbackIconId?: string`
- `size?: "sm" | "md" | "lg"`

---

### 21. `src/ui/runtime/world/selection/body/BodyIdentity.tsx` — add

**Responsibility**

Render the body’s permanent identifier: avatar + display name.

**Logic**

Inputs:

- avatar subject id
- display name
- fallback icon id

Behavior:

- render `BodyAvatar`
- render the display name beside it
- do not render gender

**Interface**

`BodyIdentity` props:

- `subjectId: string | undefined`
- `displayName: string`
- `fallbackIconId?: string`

## 9.4 Selection-folder reorganization and cards

### 22. `src/ui/runtime/world/selection/selectionLensMap.ts` — change

**Responsibility**

Route selections to the correct lens after the body/face split and after folder moves.

**Logic**

- import `CaveCard` from `selection/cave/CaveCard`
- import `FaceCard` from `selection/face/FaceCard`
- import `SwarmCard` from `selection/swarm/SwarmCard`
- import `BodyCard` from `selection/body/BodyCard`

Match rules:

- `face` lens matches entities with a runtime or blueprint face component only
- `body` lens matches direct bodies and proxies only

**Interface**

Public `resolveSelectionLens` signature remains unchanged.

---

### 23. `src/ui/runtime/world/selection/selectionLensMap.flyweight.test.ts` — change

**Responsibility**

Verify the new selection routing.

**Logic to verify**

- face blueprint resolves to `face`
- direct body resolves to `body`
- proxy resolves to `body`
- cave/swarm routing remains unchanged

---

### 24. `src/ui/runtime/world/selection/selectionUtils/entity.ts` — change

**Responsibility**

Provide the shared body-target and non-blank-name helpers required by body/face/swarm cards.

**Logic**

Add:

- a helper that treats blank strings as missing
- `resolveBodySelectionTargetId(entity): string | undefined`
  - direct body → `entity.id`
  - proxy → `entity.proxy.originalId`
  - otherwise `undefined`
- `resolveBodyDisplayName(entity)` that prefers non-blank `passport.name` and falls back to display label / entity label / id

**Interface**

Existing exports remain; new helpers are added.

---

### 25. `src/ui/runtime/world/selection/components/AttributesList.tsx` — add

**Responsibility**

Shared renderer for body/mind/social values.

**Logic**

Inputs:

- `attributes: { body; mind; social }`
- `variant: "section" | "inline"`
- optional title

Behavior:

- `section` variant uses the same visual structure as cave capability stats
- `inline` variant uses compact row layout
- always render the three standard attribute icons in the same order

**Interface**

`AttributesList` props:

- `attributes`
- `variant`
- `title?`

---

### 26. `src/ui/runtime/world/selection/components/AttributesList.test.tsx` — add

**Responsibility**

View coverage for the shared attribute renderer.

**Logic to verify**

- renders all three values in `section` mode
- renders all three values in `inline` mode
- does not crash on zero values

---

### 27. `src/ui/runtime/world/selection/body/bodyCardSelectors.ts` — add

**Responsibility**

Selectors used by `BodyCard` and `BodyCardContent`.

**Logic**

Selectors must provide:

- display name using non-blank passport fallback rules
- portrait icon fallback id
- level
- xp
- health
- max health
- attributes

Comparers must reuse `attributesEqual` for attribute stability.

**Interface**

Selector-only file. No React.

---

### 28. `src/ui/runtime/world/selection/body/useBodyCardData.ts` — add

**Responsibility**

Resolve all body-card view data from the selected entity and runtime.

**Logic**

Inputs:

- selected entity
- runtime

Steps:

1. Resolve body target id using `resolveBodySelectionTargetId`.
2. Read live level/xp/health/maxHealth/attributes from the target body id.
3. Compute `xpToNextLevel` through `resolveXpThreshold(liveLevel)`.
4. Resolve display name through non-blank passport fallback rules.
5. Resolve fallback icon id from `passport.portraitIcon` or current display key.
6. Resolve modifiers/traits via `useEntityAnalysis(entity, runtime, targetId)`.
7. Resolve description from target entity if present; otherwise selected entity.

**Interface**

Returns a stable data object containing only render data.

---

### 29. `src/ui/runtime/world/selection/body/BodyXpAndLevel.tsx` — add

**Responsibility**

Dedicated body XP/level component.

**Logic**

Render two compact stat items:

- `body_xp` → `[current xp / xp to next level]`
- `body_level` → `[current level]`

No bar.

**Interface**

Props:

- `liveXp`
- `liveXpMax`
- `liveLevel`

---

### 30. `src/ui/runtime/world/selection/body/BodyCardContent.tsx` — add

**Responsibility**

Inner content renderer shared by the full card and tooltip.

**Logic**

Inputs:

- prepared body-card data

Render order:

1. `BodyIdentity`
2. description text
3. `BodyXpAndLevel`
4. health row + health bar
5. `AttributesList` in `section` mode
6. `ModifierList`
7. `TraitList`

**Interface**

Receives already-resolved render data; does not query runtime directly.

---

### 31. `src/ui/runtime/world/selection/body/BodyCard.tsx` — add

**Responsibility**

Selection lens component for direct bodies and proxies.

**Logic**

- call `useBodyCardData(entity, runtime)`
- wrap `BodyCardContent` in `SelectionCardRoot`

**Interface**

Implements `SelectionCardProps`.

---

### 32. `src/ui/runtime/world/selection/body/BodyCard.test.tsx` — add

**Responsibility**

View coverage for body selection rendering.

**Logic to verify**

- direct body renders body identity, XP/level text, and modifiers/traits sections
- proxy selection resolves original body data
- blank passport name falls back safely

---

### 33. `src/ui/runtime/world/selection/cave/CaveCard.tsx` — move

**Responsibility**

Same as today.

**Logic**

No behavior change; import paths only.

**Interface**

Unchanged.

---

### 34. `src/ui/runtime/world/selection/cave/CaveXpAndPop.tsx` — move

**Responsibility**

Same as today.

**Logic**

No behavior change; import paths only.

**Interface**

Unchanged.

---

### 35. `src/ui/runtime/world/selection/face/FaceCard.tsx` — move

**Responsibility**

Same face-slot rendering as today.

**Logic**

No behavior change other than the file move and updated imports.

**Interface**

Unchanged.

---

### 36. `src/ui/runtime/world/selection/face/useFaceCardData.ts` — move

**Responsibility**

Same as today.

**Logic**

No behavior change.

**Interface**

Unchanged.

---

### 37. `src/ui/runtime/world/selection/face/faceCardSelectors.ts` — change during move

**Responsibility**

Same selectors as today, but blank-name handling must be corrected.

**Logic**

`selectName` must treat blank strings as missing and fall back to display label / entity label.

**Interface**

Selector signatures unchanged.

---

### 38. `src/ui/runtime/world/selection/swarm/SwarmCard.tsx` — move and change

**Responsibility**

Render the swarm card and swarm totals list.

**Logic**

- replace the inline swarm totals markup with `AttributesList` in `section` mode
- keep member list virtualization unchanged

**Interface**

Component props unchanged.

---

### 39. `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx` — move and change

**Responsibility**

Render a swarm member row and its hover tooltip.

**Logic**

- replace inline attribute markup with `AttributesList` in `inline` mode
- wrap the full row in `SmartTooltip`
- tooltip content = `BodyCardContent` built from that row’s body id

**Interface**

Props unchanged:

- `runtime`
- `entityId`

---

### 40. `src/ui/runtime/world/selection/swarm/swarmCardSelectors.ts` — change during move

**Responsibility**

Selectors for swarm member rows.

**Logic**

- `selectLabel` must treat blank passport names as missing
- `selectIcon` continues to prefer `passport.portraitIcon`, then display key

**Interface**

Selector signatures unchanged.

---

### 41. `src/ui/runtime/world/selection/swarm/SwarmCard.styles.ts` — move and narrow

**Responsibility**

Keep only row/frame/status styling that is still swarm-specific.

**Logic**

Remove attribute styles that are superseded by shared `AttributesList` styling.

**Interface**

Exports only the swarm-specific styled elements still in use.

---

### 42. `src/ui/runtime/world/selection/swarm/useSwarmMemberIds.ts` — move

**Responsibility**

Same as today.

**Logic**

No behavior change.

**Interface**

Unchanged.

---

### 43. `src/ui/runtime/world/selection/swarm/SwarmCard.test.tsx` — change during move

**Responsibility**

View coverage for swarm row rendering and tooltip wiring.

**Logic to verify**

- row still renders starvation/cold indicators
- swarm totals render through `AttributesList`
- hovering a row reveals body-card content

## 10. Explicit non-changes

These files stay unchanged because the existing behavior already satisfies the requirement or must remain authoritative:

- `game/handlers/DispatchProxyHandler.ts`
  - proxy already stores `originalId`
- `game/handlers/proxyDisplay.ts`
  - body proxies already force `body_avatar`
- `engine/phaser/display/avatar/AvatarSeedResolver.ts`
  - already resolves avatar permanence correctly for body/proxy/face
- `engine/compiler/abilities/passportCompiler.ts`
  - already preserves `portraitIcon` and `glyphKey` on body blueprints while routing the display key to `body_avatar`
- `ui/runtime/world/selection/components/ModifierList.tsx`
- `ui/runtime/world/selection/components/TraitList.tsx`

## 11. Test plan

The implementation must add or update the following test layers.

## 11.1 Unit tests

Target: `src/lib/**`

Required new unit coverage:

1. `bodyIdentityGenerator.test.ts`
   - deterministic generation
   - placeholder detection
   - family-name concatenation
   - authored-name preservation

## 11.2 Integration tests

Targets: `src/engine/runtime/**`, `src/game/**`

Required coverage:

1. spawn path
   - spawned body gets `identitySerial`
   - placeholder passport gets generated identity
   - `portraitIcon`/`glyphKey` are preserved
2. legacy backfill path
   - blank-name existing body gets passport patch through normal body updates
   - authored name is not overwritten
3. lens routing
   - direct body → `BodyCard`
   - proxy → `BodyCard`
   - face → `FaceCard`

## 11.3 View tests

Targets: `src/ui/**`

Required coverage:

1. `BodyCard`
   - renders identity, XP/level text, attributes, modifiers, traits
2. `BodyAvatar`
   - renders layered avatar when bridge resolves
   - renders icon fallback when bridge is unavailable
3. `SwarmRowItem`
   - hover opens tooltip with body-card content
4. `AttributesList`
   - both variants render correctly

## 11.4 Test-style requirements

All tests must follow the existing project test contract:

- behavior-first assertions
- Given/When/Then structure
- real data factories where applicable
- no UI business-logic tests
- no ECS-world mocks for integration tests

## 12. Implementation order

1. Extend `PassportSchema`.
2. Add the static catalog module from the attached name file.
3. Add the pure generator and its unit tests.
4. Replace `spawnBodySerial` with `spawnBodyIdentity` and update both spawn call sites.
5. Extend `BodyUpdatePayload` and `UpdateBodiesBatchHandler` for passport patches.
6. Add legacy backfill in body update payload construction and cover it with integration tests.
7. Add the Phaser avatar bridge and the React hook.
8. Create the body folder, body selectors/hook/components/tests.
9. Move face/swarm/cave files into lens folders.
10. Add `AttributesList`, update swarm card/row, and add tooltip coverage.
11. Update `selectionLensMap` last, after all imports and components exist.

## 13. Acceptance criteria

The work is complete only when all of the following are true:

1. Direct bodies and proxies open `BodyCard`.
2. Faces still open `FaceCard`.
3. Swarm totals and swarm-row attributes both render through `AttributesList`.
4. Hovering a swarm row shows a body-card tooltip.
5. New spawned placeholder bodies receive persistent generated identity.
6. Existing blank-name bodies are backfilled without overwriting authored names.
7. Body avatar imagery is visible in React through the bridge and remains stable across body/proxy/face representations.
8. Selection files are reorganized so each lens has its own folder.
9. Tests pass under the project’s current contract.
