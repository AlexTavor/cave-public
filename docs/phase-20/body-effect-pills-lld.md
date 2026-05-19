# LLD: Body Card Trait and Modifier Effect Pills

## 1. Why

The body card currently displays trait and modifier effects as textual rows. This consumes vertical space and differs from the compact horizontal presentation already used by the body card's Habiti section.

This change makes trait and modifier effects compact and scan-friendly while preserving the current textual detail on hover. The body card remains a read-only UI surface: it observes resolved semantic state and does not introduce simulation mutation, duplicated runtime state, or business logic in React components.

## 2. What

### 2.1 Scope

Change only the body-selection UI presentation of entity traits and modifiers.

Affected runtime data remains unchanged:

- `EntityTraitSummary`
- `TraitEffectLabel`
- `EntityModifierLabel`
- `BodyCardData`
- `resolveBodyCardData`
- `analyzeEntityState`

No ECS, runtime, command, handler, system, blueprint, or simulation behavior changes are part of this task.

### 2.2 Required user-visible behavior

Traits and modifiers in the body card must render as compact horizontal pills.

Each visible pill contains exactly:

1. one icon, when the target key has a known icon mapping
2. one compact value string

The visible pill must not contain:

- trait label
- modifier target key text
- modifier source ID
- trait description
- source type
- explanatory prose

The existing textual information must be available only through hover tooltip content.

### 2.3 Compact value contract

The compact value string is derived from existing fields only:

- `valueStr` is always included
- `intervalStr` is appended immediately after `valueStr` when present
- no target key is appended
- no source ID is appended
- no whitespace is inserted between `valueStr` and `intervalStr`

Examples:

- `valueStr = "-1"`, `intervalStr = "/s"` renders `-1/s`
- `valueStr = "+9"`, `intervalStr = undefined` renders `+9`
- `valueStr = "+1"`, `intervalStr = "/5s"` renders `+1/5s`

### 2.4 Icon mapping contract

The body effect icon mapping must use the mapping already present in `TraitList.tsx` today:

| target key | icon ID |
|---|---|
| `body` | `attr_body` |
| `mind` | `attr_mind` |
| `social` | `attr_social` |
| `food` | `food` |
| `health` | `health` |

Unknown target keys must not throw and must not invent an icon. They render a pill with only the compact value.

### 2.5 Tooltip contract

Tooltips use the existing `SmartTooltip` mechanism.

Trait effect tooltip content must contain exactly the textual information currently visible for that trait effect row:

- trait label
- effect value with interval, followed by target key
- trait description, only when present

Modifier tooltip content must contain exactly the textual information currently visible for that modifier row:

- modifier target key
- modifier value with interval, followed by source ID in parentheses

`sourceType` must not be added to the tooltip because the current body-card modifier display does not show it.

### 2.6 Visual styling contract

All trait and modifier pills must share the same visual styling.

No pill may change foreground color, background, border, or radius based on:

- positive value
- negative value
- target key
- trait versus modifier
- source ID
- source type

The pill row must use the same horizontal wrapping model as the existing Habiti list:

- flex row
- wrapping enabled
- themed gap
- compact inline-flex pills

The implementation must use Emotion styled components and theme tokens only. No inline magic values may be introduced.

## 3. How

## 3.1 Files to add

### 3.1.1 `src/ui/runtime/world/selection/components/effectPillPresentation.ts`

Responsibility:

- Own pure presentation helpers for body-card effect pills.
- Centralize the target-key-to-icon mapping so `TraitList.tsx` and `ModifierList.tsx` do not duplicate it.
- Keep formatting rules outside `.tsx` rendering branches.

Logic:

- `resolveBodyEffectIconId(targetKey)` returns a known icon ID or `undefined`.
- `formatCompactEffectValue(valueStr, intervalStr)` returns `valueStr` followed by `intervalStr` when present.
- `formatFullEffectValue(valueStr, intervalStr, targetKey)` returns the current full effect value text used in trait hover content: value, interval, one space, target key.
- `formatModifierSourceValue(valueStr, intervalStr, sourceId)` returns the current modifier value text used in modifier hover content: value, interval, one space, source ID in parentheses.

Interface:

- Input values are existing string fields from `TraitEffectLabel` or `EntityModifierLabel`.
- The helper must not accept runtime entities, stores, ECS world objects, React nodes, or theme objects.
- The helper must not mutate input data.
- Unknown target keys return `undefined` for icon resolution.

### 3.1.2 `src/ui/runtime/world/selection/components/EffectPill.tsx`

Responsibility:

- Render one compact effect pill.
- Wire the pill to `SmartTooltip`.
- Contain no domain-specific formatting or target-key mapping.

Logic:

- Receives a resolved `iconId`, a resolved compact `valueText`, and resolved tooltip content.
- Renders `GameIcon` only when `iconId` is present.
- Renders the value text in the pill.
- Wraps the pill in `SmartTooltip` when tooltip content is present.
- Does not derive positivity, negativity, target names, source names, or descriptions.

Interface:

- `iconId?: string`
- `valueText: string`
- `tooltipContent: React.ReactNode`
- optional stable keying remains the caller's responsibility

No component state is allowed.

### 3.1.3 `src/ui/runtime/world/selection/components/TraitList.test.tsx`

Responsibility:

- Verify body trait effects are presented as compact effect pills.
- Verify current textual trait detail is available through tooltip content and not duplicated in the visible pill text.

Logic:

- Render `TraitList` with one trait containing at least one effect with `intervalStr` and `description`.
- Use the same `ThemeProvider` and `IconRegistryProvider` pattern used by existing body-card UI tests.
- Mock `SmartTooltip` the same way `HabitiList.test.tsx` does: render the trigger and tooltip content in the test DOM so hover content is assertable without testing floating-ui behavior.

Required assertions:

- visible compact value is present, for example `-1/s`
- visible target key text is not present as standalone pill text
- trait label is present only in mocked tooltip content
- trait description is present only in mocked tooltip content
- no polarity-specific visual contract is asserted here; styling is covered by style-level assertions below or by DOM structure checks

### 3.1.4 `src/ui/runtime/world/selection/components/ModifierList.test.tsx`

Responsibility:

- Verify body modifiers are presented as compact effect pills.
- Verify current textual modifier detail is available through tooltip content and not duplicated in the visible pill text.

Logic:

- Render `ModifierList` with at least one modifier containing `targetKey`, `valueStr`, `intervalStr`, `sourceType`, and `sourceId`.
- Use `ThemeProvider` and `IconRegistryProvider`.
- Mock `SmartTooltip` consistently with `HabitiList.test.tsx`.

Required assertions:

- visible compact value is present, for example `+1/5s`
- visible source ID is not present in the pill trigger text
- target key and full modifier value with source ID are present in mocked tooltip content
- `sourceType` is not rendered unless it is already part of `sourceId`

## 3.2 Files to change

### 3.2.1 `src/ui/runtime/world/selection/components/analysisStyles.ts`

Current responsibility:

- Provides styling for trait and modifier value presentation.

New responsibility:

- Provide shared styling for body-card effect pill rows and pills.

Required changes:

- Replace row styling that aligns effect content to the right with a horizontal wrapping pill row suitable for dense compact display.
- Replace polarity-colored value styling with a neutral pill/value styling shared by every effect pill.
- Remove or stop exporting styling that is no longer used by any component after this task.

Required exported styling responsibilities:

- `EffectsRow`: flex row, wrapping enabled, themed gap, left-aligned by default.
- `EffectPillRoot`: inline-flex pill container with themed gap, padding, pill radius, border, foreground color, and background.
- `EffectPillValue`: compact value text styling using theme font tokens.
- `EffectTooltipBody`: vertical tooltip content container using themed gap and the same max-width pattern as existing Habiti tooltip content.

Interface:

- Styled components only.
- No props that alter color or styling by sign, target key, source type, or ownership.
- No hard-coded color literals or spacing literals.

### 3.2.2 `src/ui/runtime/world/selection/components/TraitList.tsx`

Current responsibility:

- Render a `Traits` section.
- Render each trait as a `StatRow` with trait label, effect text, and optional description.
- Contains a local `ICON_MAP`.

New responsibility:

- Render the `Traits` section as compact effect pills while preserving full textual detail in hover tooltips.

Required changes:

- Remove the local `ICON_MAP`.
- Use `resolveBodyEffectIconId` from `effectPillPresentation.ts`.
- Use `formatCompactEffectValue` for visible pill values.
- Use `formatFullEffectValue` for tooltip effect text.
- Do not render `StatRow` or `StatLabel` for trait items.
- Render one pill per trait effect.
- Preserve the `Traits` section title.
- Return `null` when `traits.length === 0`, unchanged from current behavior.

Trait flattening rule:

- Input order must be stable.
- Iterate traits in their existing array order.
- For each trait, iterate effects in their existing array order.
- Render each effect as one pill.

Pseudocode:

- if traits is empty: return null
- render section title `Traits`
- render `EffectsRow`
- for each trait in order:
  - for each effect in order:
    - resolve icon ID from `effect.targetKey`
    - format compact value from `effect.valueStr` and `effect.intervalStr`
    - build tooltip body containing trait label, full effect value, and optional description
    - render `EffectPill`

Tooltip content interface:

- First line: trait label.
- Second line: full effect value text.
- Third line: trait description, only when present.

### 3.2.3 `src/ui/runtime/world/selection/components/ModifierList.tsx`

Current responsibility:

- Render a `Modifiers` section.
- Render each modifier as a `StatRow` with target key label and value plus source ID.

New responsibility:

- Render the `Modifiers` section as compact effect pills while preserving full textual detail in hover tooltips.

Required changes:

- Import and use `EffectPill`.
- Import and use `resolveBodyEffectIconId`, `formatCompactEffectValue`, and `formatModifierSourceValue`.
- Do not render `StatRow` or `StatLabel` for modifier items.
- Render one pill per modifier.
- Preserve the `Modifiers` section title.
- Return `null` when `modifiers.length === 0`, unchanged from current behavior.

Modifier ordering rule:

- Render modifiers in the existing input array order.

Pseudocode:

- if modifiers is empty: return null
- render section title `Modifiers`
- render `EffectsRow`
- for each modifier in order:
  - resolve icon ID from `modifier.targetKey`
  - format compact value from `modifier.valueStr` and `modifier.intervalStr`
  - build tooltip body containing modifier target key and modifier value with source ID
  - render `EffectPill`

Tooltip content interface:

- First line: modifier target key.
- Second line: modifier value with source ID.

### 3.2.4 `src/ui/runtime/world/selection/body/BodyCard.test.tsx`

Current responsibility:

- Smoke-test body card identity, XP, attributes, and non-body suppression.

New responsibility:

- Continue smoke-testing the body card.
- Add one body-card-level regression assertion that trait and modifier compact values are visible through the integrated card.

Required changes:

- Extend the existing mocked `useEntityAnalysis` data to include interval-bearing values where needed.
- Assert compact values appear in the rendered body card.
- Do not test tooltip internals here; tooltip details belong in `TraitList.test.tsx` and `ModifierList.test.tsx`.

Interface:

- Keep existing mock boundaries.
- Keep the test at view level only.

## 3.3 Files explicitly not changed

The following files must not be changed for this task:

- `src/ui/runtime/world/selection/body/BodyCardContent.tsx`
- `src/ui/runtime/world/selection/body/resolveBodyCardData.ts`
- `src/ui/runtime/world/selection/body/bodyCardTypes.ts`
- `src/ui/runtime/world/selection/entityAnalysis/entityAnalysis.types.ts`
- `src/ui/runtime/world/selection/entityAnalysis/entityAnalysis.ts`
- any `src/engine/**` file
- any `src/game/systems/**` file
- any handler file
- any schema file

Reason:

- The requested behavior is a presentation-only change.
- The current data model already exposes all required fields.
- The body card already receives `modifiers`, `traits`, and `habiti` through `BodyCardData`.

## 4. Detailed rendering contract

## 4.1 Trait rendering

Given this resolved trait effect data:

- trait label: `Cold`
- trait description: `shivers`
- target key: `body`
- value: `-1`
- interval: `/s`

The visible pill must contain:

- `attr_body` icon
- `-1/s`

The visible pill must not contain:

- `Cold`
- `body`
- `shivers`

The tooltip content must contain:

- `Cold`
- `-1/s body`
- `shivers`

## 4.2 Modifier rendering

Given this resolved modifier data:

- target key: `health`
- value: `+1`
- interval: `/5s`
- source ID: `regeneration`
- source type: `power`

The visible pill must contain:

- `health` icon
- `+1/5s`

The visible pill must not contain:

- target key text `health`
- source ID `regeneration`
- source type `power`

The tooltip content must contain:

- `health`
- `+1/5s (regeneration)`

## 5. Test design

All tests must follow Given-When-Then structure.

### 5.1 Unit tests

Target:

- `effectPillPresentation.ts`

Required tests:

- Given a known target key, when resolving an icon, then the expected existing icon ID is returned.
- Given an unknown target key, when resolving an icon, then `undefined` is returned.
- Given `valueStr` and no `intervalStr`, when formatting a compact value, then only `valueStr` is returned.
- Given `valueStr` and `intervalStr`, when formatting a compact value, then the values are concatenated without whitespace.
- Given modifier value fields, when formatting full modifier source value, then the output contains value, interval, a space, and source ID in parentheses.

### 5.2 View tests

Targets:

- `TraitList.test.tsx`
- `ModifierList.test.tsx`
- `BodyCard.test.tsx`

Required behavior coverage:

- components render without crashing for valid props
- compact values are visible
- full old textual detail is not visible in the trigger pill
- full old textual detail is available through the mocked tooltip content
- empty arrays still render nothing

Tooltip testing boundary:

- Do not test `SmartTooltip` hover mechanics here.
- Mock `SmartTooltip` at the component-test boundary, matching the existing `HabitiList.test.tsx` pattern.
- The tooltip atom already owns floating/hover behavior.

### 5.3 Styling assertions

If style assertions are added, they must assert only this contract:

- positive and negative effect pills have the same computed color
- positive and negative effect pills have the same computed border color
- positive and negative effect pills have the same computed background color

Do not assert exact RGB values unless existing project tests already require them for the same theme token. Prefer sameness over hard-coded values.

## 6. Implementation sequence

1. Add `effectPillPresentation.ts` with pure formatting and icon-resolution helpers.
2. Add unit tests for `effectPillPresentation.ts`.
3. Change `analysisStyles.ts` to provide neutral shared effect pill styles.
4. Add `EffectPill.tsx` using `GameIcon`, `SmartTooltip`, and the shared styles.
5. Change `TraitList.tsx` to flatten trait effects into compact effect pills.
6. Change `ModifierList.tsx` to render modifiers as compact effect pills.
7. Add `TraitList.test.tsx`.
8. Add `ModifierList.test.tsx`.
9. Extend `BodyCard.test.tsx` with integrated compact-value assertions.
10. Run the available test and lint commands from the repository root.

## 7. Acceptance criteria

The task is complete only when all criteria below are true:

- Body card `Traits` section renders compact horizontal pills.
- Body card `Modifiers` section renders compact horizontal pills.
- Each pill shows only icon and compact value.
- Tooltip contains the prior textual information for that pill.
- Trait and modifier pills use the same styling.
- Positive and negative values do not alter pill styling.
- Existing Habiti behavior is unchanged.
- `BodyCardContent.tsx` remains structurally unchanged unless a test proves it must change.
- No runtime, ECS, command, system, handler, schema, or blueprint files are changed.
- Tests are added or updated at the unit and view layers defined above.
- No TODOs are introduced.
- No direct DOM mutation, runtime mutation, or app state mutation is introduced by the UI.

## 8. Non-goals

- Do not redesign Habiti pills.
- Do not redesign Understanding pills.
- Do not add new effect types.
- Do not change modifier calculation.
- Do not change trait calculation.
- Do not add source type to user-visible output.
- Do not add sorting or grouping.
- Do not add filtering.
- Do not introduce local React state.
- Do not introduce Zustand state.
- Do not modify icon assets or icon registration.
