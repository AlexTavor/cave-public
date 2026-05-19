# LLD — Transfer node radius controlled by transferred quantity

## 1. Purpose (`why`)

The current implementation gives every pending transfer node the same physics radius, taken from global impulse settings. In `src/engine/runtime/handlers/transferPendingBuilder.ts`, both the runtime entity physics radius and the impulse body radius are always set from `impulseConfig.transferNodeRadius`, regardless of payload size.

That is too coarse for authored resource behavior.

This feature adds an **optional per-resource transfer-node radius rule** so a resource display asset can specify how transfer-node radius should change as the transferred amount changes.

The design must preserve these existing properties:

- **No authored data breakage**: existing `.art` files remain valid.
- **Current behavior stays the fallback**: if no per-resource rule is authored, the runtime continues to use `impulseConfig.transferNodeRadius` exactly as it does today.
- **No deprecated-path work**: the live transfer path uses normal resource display keys, not deprecated transfer display definitions. `buildPendingTransfer()` already sets `display.display_key` to the resource key derived from the payload, and `DisplayDefinitionCatalog` explicitly does not register deprecated transfer definitions. Do not implement this in the deprecated transfer display modules.
- **Contract enforcement at the editor boundary and persistence boundary**: the editor must never persist a partial or internally invalid rule.

## 2. Current state (grounded in code)

### 2.1 Editor state today

The resource subtype of the display editor currently authors only:

- `styleId`
- `glyphKey`

Relevant files:

- `src/ui/devtools/editors/assets/display/DisplayEditorResourceFields.tsx`
- `src/ui/devtools/editors/assets/display/useDisplayEditor.ts`
- `src/ui/devtools/state/moduleStore.assets.types.ts`
- `src/data/schemas/assets/displays.ts`

### 2.2 Runtime today

Pending transfer node radius is currently fixed:

- `src/engine/runtime/handlers/transferPendingBuilder.ts`
  - `pendingEntity.physics.radius = impulseConfig.transferNodeRadius`
  - `buildPendingBody(... radius: impulseConfig.transferNodeRadius ... )`

### 2.3 Transfer display path today

The live transfer node display path is already resource-driven:

- `resolveTransferVisualType(payload)` returns the first payload key.
- `buildPendingTransfer()` uses that key as `display.display_key`.
- Resource display assets are resolved through the normal display asset path.
- Deprecated transfer display definitions are intentionally not registered.

Therefore the authored rule belongs on the **resource display asset**, not on impulse config and not on deprecated transfer display modules.

## 3. Target behavior (`what`)

### 3.1 New authored contract

Each **resource display asset** may optionally contain a grouped rule:

- `transferNodeRadiusByValue.minValue`
- `transferNodeRadiusByValue.minRadius`
- `transferNodeRadiusByValue.maxValue`
- `transferNodeRadiusByValue.maxRadius`

Exact shape:

```text
transferNodeRadiusByValue?: {
  minValue: number
  minRadius: number
  maxValue: number
  maxRadius: number
}
```

### 3.2 Validity rules

The rule is either:

- **absent**, meaning the resource uses the existing global fallback radius, or
- **fully present**, meaning all four fields exist and are valid.

A partial rule is invalid.

Validation contract:

- `minValue` and `maxValue` must be finite numbers.
- `minRadius` and `maxRadius` must be finite numbers and `>= 0`.
- `minValue <= maxValue` is required.
- `minRadius <= maxRadius` is **not** required. Shrinking radius for larger amounts is allowed because the request did not prohibit it, and the runtime interpolation supports either direction.

### 3.3 Runtime behavior when rule is present

When a pending transfer node is built:

1. Resolve the transfer resource key from the payload using the existing transfer visual-type mechanism.
2. Look up that key in `cartridge.assets.displays`.
3. If the display asset is a resource asset and has `transferNodeRadiusByValue`, compute the transfer-node radius from the payload amount for that resource.
4. Apply that resolved radius to **both**:
   - `pendingEntity.physics.radius`
   - the `PhysicsBody.radius` passed to the impulse engine

### 3.4 Runtime behavior when rule is absent

If the rule is missing, invalid, or not applicable, use the existing fallback:

- `impulseConfig.transferNodeRadius`

This preserves authored modules that do not opt in.

### 3.5 Exact radius-resolution algorithm

Let:

- `amount = payload[resourceKey]`
- `rule = transferNodeRadiusByValue`

Resolution algorithm:

```text
if no resourceKey -> fallback
if no matching display asset -> fallback
if display asset is not type "resource" -> fallback
if no rule -> fallback
if amount is not finite -> fallback
if rule is structurally invalid -> fallback + loud error log

if rule.minValue === rule.maxValue:
    return amount < rule.minValue ? rule.minRadius : rule.maxRadius

if amount <= rule.minValue:
    return rule.minRadius

if amount >= rule.maxValue:
    return rule.maxRadius

ratio = (amount - rule.minValue) / (rule.maxValue - rule.minValue)
return rule.minRadius + (rule.maxRadius - rule.minRadius) * ratio
```

This is a **linear interpolation with endpoint clamping**.

### 3.6 Scope boundary

This feature changes only **pending transfer-node radius selection**.

It does **not**:

- change how transfer payloads are calculated
- change transfer permissions or capacity clamping
- change global impulse defaults
- reintroduce deprecated transfer display definitions
- add a new global configuration screen

## 4. Implementation design (`how`)

## 4.1 Data model

### File: `src/data/schemas/assets/displays.ts`

**Responsibility**

Own the persisted schema for display assets inside `.art` files.

**Change**

Extend `ResourceDisplayAssetSchema` with an optional `transferNodeRadiusByValue` object.

**Required logic**

- Add a dedicated nested schema for the rule in this file.
- Enforce the grouped “all four fields or none” contract structurally.
- Enforce `minValue <= maxValue` with schema refinement.
- Export the inferred TypeScript type through the existing schema exports in this file.

**Interface after change**

`ResourceDisplayAssetSchema` parses:

```text
{
  type: "resource",
  styleId: string,
  glyphKey: string,
  tooltip?: string,
  tags?: string[],
  transferNodeRadiusByValue?: {
    minValue: number,
    minRadius: number,
    maxValue: number,
    maxRadius: number,
  }
}
```

**Notes**

Do not add a second optional nesting level. The whole grouped rule is the toggle boundary.

---

### File: `src/ui/devtools/state/moduleStore.assets.types.ts`

**Responsibility**

Mirror the authored display-asset shape used by the devtools session store.

**Change**

Extend the `type: "resource"` union member with the optional `transferNodeRadiusByValue` object.

**Required logic**

- Match the schema shape exactly.
- Keep property names identical to the schema.
- Do not widen the type to partial fields.

**Interface after change**

The `ModuleDisplayAsset` resource variant must carry the same optional object defined in `displays.ts`.

## 4.2 Editor authoring flow

### File: `src/ui/devtools/editors/assets/display/useDisplayEditor.ts`

**Responsibility**

Own editor-side mutations into the session draft for display assets.

**Change**

Add draft-mutation handlers for the new grouped rule.

**Required logic**

- Add a handler that writes the full rule atomically.
- Add a handler that removes the rule entirely.
- Do not write partial subfields directly from the editor into the session draft.
- Keep all draft writes inside the existing `assetSession.handleChange(...)` mechanism.

**Interface after change**

Expose to the resource fields component:

- the current authored rule (or `undefined`)
- `handleTransferNodeRadiusRuleChange(rule)` where `rule` is either a complete valid object or `undefined`

No other draft mutation API is permitted for this feature.

---

### File: `src/ui/devtools/editors/assets/display/useDisplayTransferNodeRadiusForm.ts` **(new)**

**Responsibility**

Own the transient grouped form state for the optional transfer-node-radius rule.

This hook exists so the `.tsx` view remains render-only and the business rules stay out of the component.

**Inputs**

- `initialRule: rule | undefined`
- `onCommit: (rule | undefined) => void`

**Outputs**

- `isEnabled: boolean`
- `fields: { minValue: string; minRadius: string; maxValue: string; maxRadius: string }`
- `error: string | null`
- `setField(name, value)`
- `enable()`
- `clear()`
- `commit()`

**Required logic**

- When `initialRule` exists, initialize the local string fields from it.
- When `initialRule` is absent, initialize as disabled with blank local fields.
- `commit()` must:
  - require all four fields to be present
  - parse all four values
  - reject non-finite values
  - reject `minValue > maxValue`
  - call `onCommit(fullRule)` only when the full rule is valid
- `clear()` must call `onCommit(undefined)` and reset local fields.
- The hook must never emit a partial rule.

**Validation message contract**

Use explicit, deterministic copy:

- `All transfer radius fields are required.`
- `Transfer radius values must be finite numbers.`
- `Min value cannot be greater than max value.`
- `Transfer radius values must be greater than or equal to 0.` This applies only to radius fields.

Do not invent additional validation messages.

---

### File: `src/ui/devtools/editors/assets/display/DisplayEditorResourceFields.tsx`

**Responsibility**

Render the resource-specific sub-editor for display assets.

**Change**

Render the new optional grouped rule section.

**Required logic**

- Keep the existing `Style ID` and `Glyph Key` fields unchanged.
- Add a distinct subsection labeled `Transfer Node Radius by Value`.
- When no rule is authored:
  - show an action to start authoring the rule
  - do not persist anything until the grouped form commits a full valid rule
- When the rule exists or is being authored:
  - render these numeric inputs with exact labels:
    - `Min Value`
    - `Min Radius`
    - `Max Value`
    - `Max Radius`
  - render a `Clear` action that removes the entire rule
- Surface the current validation error from the hook inline in the section.

**Editor contract**

The draft may contain either:

- no `transferNodeRadiusByValue`, or
- a complete valid `transferNodeRadiusByValue`

It must never contain an object with only some of the four fields.

---

### File: `src/ui/devtools/editors/assets/display/DisplayEditorDefinitionSection.tsx`

**Responsibility**

Compose the correct subtype editor for the selected display-asset kind.

**Change**

Pass the new rule props into `DisplayEditorResourceFields`.

**Required logic**

- Only the `resource` subtype receives the new props.
- `body` and `attribute_pool` behavior remains unchanged.

---

### File: `src/ui/devtools/editors/assets/display/DisplayEditor.tsx`

**Responsibility**

Allocate stable control IDs for the display editor.

**Change**

Add control IDs for the four new numeric inputs and any section-level controls that need explicit label association.

**Required logic**

- IDs must be stable per render via `useId()`.
- Labels must stay associated with inputs for testing-library and accessibility.

---

### File: `src/ui/devtools/editors/assets/display/DisplayEditorSection.types.ts`

**Responsibility**

Type the section props shared between display editor sections.

**Change**

Extend the `ids` shape and, if needed, the editor prop typing so the resource section can receive the new controls cleanly.

**Required logic**

- Keep the typing exact.
- Do not use `any` for the new IDs.

## 4.3 Runtime resolution

### File: `src/engine/runtime/handlers/resolveTransferNodeRadius.ts` **(new)**

**Responsibility**

Resolve the physics radius for a pending transfer node from:

- transfer payload
- authored resource display asset
- global impulse fallback

This file is the single source of truth for the new runtime rule.

**Inputs**

```text
{
  payload: Record<string, number>
  displays: Record<string, DisplayAsset | unknown>
  fallbackRadius: number
}
```

**Outputs**

```text
{
  radius: number
  warning: string | null
}
```

**Required logic**

- Determine the resource key using the existing transfer visual-type rule.
- Read the display asset from `displays[resourceKey]`.
- Only apply authored scaling when that asset is `type: "resource"` and has the optional rule.
- Use the exact interpolation contract from section 3.5.
- If the authored data is malformed despite schema/editor protections, return the fallback radius and a warning string. Do not throw.

**Why this file exists**

- The logic is non-trivial.
- It must be unit-tested independently.
- It should not live inline inside `transferPendingBuilder.ts`.
- It must not depend on Phaser/UI modules.

---

### File: `src/engine/runtime/handlers/transferPendingBuilder.ts`

**Responsibility**

Build the runtime entity and impulse body for a pending transfer node.

**Change**

Replace direct use of `impulseConfig.transferNodeRadius` with the resolver described above.

**Required logic**

- Call the new resolver once per pending transfer build.
- Use the returned radius for:
  - `pendingEntity.physics.radius`
  - `buildPendingBody(... options.radius ... )`
- If the resolver returns a warning, emit it through `context.telemetry.log("errors", ...)`.
- Continue to use the existing global mass and drag values unchanged.
- Continue to use the existing spawn-position and targeting logic unchanged.

**Important**

Do not change:

- `resolveTransferVisualType(...)`
- `buildPayloadLabel(...)`
- spawn-point resolution
- transfer mass / drag
- pending tag / display label / target assignment behavior

## 4.4 Persistence-time contract enforcement

### File: `src/ui/devtools/state/moduleStore.actions.module.ts`

**Responsibility**

Central save path for session-backed module saves.

**Change**

Run the full `ModuleCartridgeSchema` parse on the module being saved before persistence.

**Required logic**

- Keep the existing ability sanitization logic.
- After sanitization, run `ModuleCartridgeSchema.parse(sanitized)` unconditionally.
- Persist the parsed module result.

**Why this change is required**

Today, asset edits saved through the session path can bypass a full runtime parse if ability sanitization did not modify anything. The new grouped rule has structural invariants that must be enforced at save time, not only on future reload.

This uses the existing schema mechanism already present in the codebase. It is not a new validation system.

## 5. Files changed / added

## 5.1 Changed files

1. `src/data/schemas/assets/displays.ts`
2. `src/ui/devtools/state/moduleStore.assets.types.ts`
3. `src/ui/devtools/editors/assets/display/useDisplayEditor.ts`
4. `src/ui/devtools/editors/assets/display/DisplayEditorResourceFields.tsx`
5. `src/ui/devtools/editors/assets/display/DisplayEditorDefinitionSection.tsx`
6. `src/ui/devtools/editors/assets/display/DisplayEditor.tsx`
7. `src/ui/devtools/editors/assets/display/DisplayEditorSection.types.ts`
8. `src/engine/runtime/handlers/transferPendingBuilder.ts`
9. `src/ui/devtools/state/moduleStore.actions.module.ts`

## 5.2 New files

1. `src/ui/devtools/editors/assets/display/useDisplayTransferNodeRadiusForm.ts`
2. `src/engine/runtime/handlers/resolveTransferNodeRadius.ts`
3. `src/data/schemas/assets/displays.test.ts`
4. `src/ui/devtools/editors/assets/display/useDisplayTransferNodeRadiusForm.test.tsx`
5. `src/engine/runtime/handlers/resolveTransferNodeRadius.test.ts`

## 6. Detailed behavior contract

## 6.1 Editor contract

- The section exists only when `draft.type === "resource"`.
- The authored module file either has no `transferNodeRadiusByValue` property or has the full valid object.
- The editor must never write a partial object.
- The editor must never allow `minValue > maxValue` to be committed.
- Clearing the rule removes the entire property.
- Switching the asset type away from `resource` drops the rule because the non-resource union members do not own it.

## 6.2 Runtime contract

- Runtime lookup uses the transfer payload’s resource key.
- Only that resource display asset can control the transfer-node radius.
- Missing rule = current global fallback.
- Malformed authored rule = loud error log + current global fallback.
- The same resolved radius must be used consistently for both the runtime entity physics data and the impulse body.

## 6.3 Compatibility contract

- Existing authored modules require no migration.
- Existing transfers without authored rules behave identically to today.
- Absorption spectacle transfers also inherit the feature automatically because they already build pending transfers through `buildPendingTransfer()`.

## 7. Tests

The tests below are mandatory. They follow the project testing contract: behavior-focused, readable, and using existing factories/utilities.

## 7.1 Schema tests

### File: `src/data/schemas/assets/displays.test.ts` **(new)**

Add unit tests for the new resource display schema.

Required cases:

1. **accepts resource display without rule**
   - Given a normal resource asset with `styleId` and `glyphKey`
   - When parsed
   - Then parsing succeeds

2. **accepts complete valid rule**
   - Given all four fields with `minValue < maxValue`
   - When parsed
   - Then parsing succeeds

3. **rejects partial rule**
   - Given only one, two, or three of the four fields
   - When parsed
   - Then parsing fails

4. **rejects minValue greater than maxValue**
   - Given `minValue > maxValue`
   - When parsed
   - Then parsing fails

5. **rejects negative radius**
   - Given either radius `< 0`
   - When parsed
   - Then parsing fails

## 7.2 Runtime unit tests

### File: `src/engine/runtime/handlers/resolveTransferNodeRadius.test.ts` **(new)**

Required cases:

1. **falls back when no rule exists**
2. **uses min radius below authored range**
3. **uses max radius above authored range**
4. **interpolates linearly inside authored range**
5. **supports descending radius across increasing value**
6. **uses step behavior when minValue equals maxValue**
7. **falls back and returns warning for malformed rule input**

### File: `src/engine/runtime/handlers/transferPendingBuilder.test.ts`

Add or update cases:

1. **uses authored transfer-node radius when resource display asset provides rule**
   - Assert both `pendingEntity.physics.radius` and returned `body.radius`

2. **falls back to impulseConfig.transferNodeRadius when resource display asset has no rule**

3. **logs error and falls back when resolver reports malformed data**

## 7.3 UI tests

### File: `src/ui/devtools/editors/assets/display/useDisplayTransferNodeRadiusForm.test.tsx` **(new)**

Required cases:

1. **commit emits full rule only when all four fields are valid**
2. **commit rejects partial authoring**
3. **commit rejects minValue greater than maxValue**
4. **clear removes the rule**
5. **initialRule hydrates the local form state**

### File: `src/ui/devtools/editors/assets/display/DisplayEditor.test.tsx`

Update existing resource-editor coverage to assert:

1. the new section appears for `resource`
2. the four labels render when the rule is being authored
3. the section is absent for `body` and `attribute_pool`
4. clearing the rule delegates to the correct handler path

### File: `src/ui/devtools/editors/assets/AssetEditorFlow.test.tsx`

Extend the end-to-end asset flow test:

- create a display asset
- author `styleId` and `glyphKey`
- author the four transfer-radius fields
- save
- assert the persisted display asset contains the full `transferNodeRadiusByValue` object

## 7.4 Save-path validation test

### File: `src/ui/devtools/state/moduleStore.store.test.ts`

Add a store-level test:

- Given a module draft containing an invalid `transferNodeRadiusByValue` rule
- When `saveModuleCartridge(...)` is called
- Then save rejects before IO persistence

This proves the persistence contract is enforced centrally, not only by the editor UI.

## 8. Non-goals

Do not do any of the following as part of this task:

- migrate legacy `assets.resources` data
- revive or alter deprecated transfer display definitions/modules
- change transfer payload semantics
- change mass/drag handling for transfer nodes
- generalize this into a global “all physics radii scale by value” framework
- refactor unrelated editor infrastructure

## 9. Acceptance criteria

Implementation is complete only when all of the following are true:

1. A resource display asset can optionally author a complete `transferNodeRadiusByValue` rule.
2. The display editor never persists a partial rule.
3. The display editor never commits `minValue > maxValue`.
4. `buildPendingTransfer()` uses the authored rule when present.
5. `buildPendingTransfer()` uses the global impulse fallback when the rule is absent.
6. Malformed authored data triggers a loud error log and safe fallback.
7. The same resolved radius is applied to both runtime physics representations.
8. Existing modules with no authored rule behave exactly as before.
9. All new and updated tests pass.

## 10. Implementation order

Apply changes in this order to minimize breakage:

1. Extend schema and devtools types.
2. Add runtime resolver + tests.
3. Wire `transferPendingBuilder.ts` to the resolver.
4. Add editor-side grouped form hook.
5. Render the new editor section.
6. Add save-time schema parse.
7. Update UI and store tests.
8. Run full targeted test set for schema, runtime handlers, display editor, asset flow, and store save path.

