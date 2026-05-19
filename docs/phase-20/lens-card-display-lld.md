# LLD: Selection Lens Card Display System

## 1. Status

**Document type:** Low-level design.

**Scope:** Replace the display contents of the existing selection lens cards with a shared atoms / molecules / organisms display system.

**In scope lens cards:**

- `src/ui/runtime/world/selection/body/BodyCard.tsx`
- `src/ui/runtime/world/selection/cave/CaveCard.tsx`
- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- `src/ui/runtime/world/selection/ResourceCard.tsx`
- `src/ui/runtime/world/selection/TransferCard.tsx`
- `src/ui/runtime/world/selection/DisplayCard.tsx`

These are the cards selected through `src/ui/runtime/world/selection/selectionLensMap.ts`.

**Out of scope:**

- Simulation behavior.
- ECS mutation behavior.
- Blueprint schema semantics.
- Codex implementation.
- Absorption card interaction behavior and body selector behavior, except where assignment job lens content currently imports shared absorption display helpers.
- Visual redesign outside the card-content system described here.

**Contract:** This design is a UI refactor. It must preserve gameplay semantics and visible information while replacing scattered card display renderers with a common card-display grammar.

---

## 2. Why

### 2.1 Current problem

The current selection lens card display logic is spread across many bespoke components:

- Body cards compose identity, description, activation notice, XP/level, health, attributes, modifiers, traits, and Habiti through separate components in `BodyCardContent.tsx`.
- Cave cards compose separate sections for XP/population, vitals, sustainment, capabilities, Habiti, understanding, modifiers, and traits in `CaveCardView.tsx`.
- Job cards compose power matrix, cycle bar, next-cycle effects, storage bars, traits, requirements, and action areas from multiple unrelated display systems.
- Resource cards render storage through `StorageAbilityDisplay`.
- Transfer cards use raw stat rows.
- Display cards use bespoke title/description rendering.

The result is inconsistent visual grammar and repeated logic for the same display concepts: title, description, value, value modifier, rate, tooltip, click affordance, tag-like capsule, effect-like capsule, and section layout.

### 2.2 Rendering problem

Fast-changing runtime values should not force full card rerenders. The existing code already contains mechanisms for optimized DOM updates:

- `useImperativeRuntimeDerivedValue` updates derived React state only when a comparator says the resolved value changed.
- `useEntityTextRef` registers a text element with `EntityStateLinkProvider` and lets the entity-state-link runtime update text content without rerendering the card.
- `useEntityBarRef` registers a fill element and updates its transform without rerendering the card.
- `AbilityBarDisplay` already uses `useEntityTextRef` and `useEntityBarRef` for live value text and bars.
- `ResourceCard.live.test.tsx` already verifies that visible storage text can update without rerendering the card body.

This design must reuse those mechanisms rather than introducing a second live-rendering system.

### 2.3 UX problem

Values and their causes are currently separated. Example: attributes render as values in `AttributesList`, while cave attribute modifiers render later in `ModifierList`. This requires the player to mentally bind a loose modifier pill back to its target value.

The new display grammar binds values to their local explanations:

- Attribute: `[icon] value (modifier)`
- Live stat: `[icon] current/max rate`
- Residual effect: `[icon] modifier`
- Habitus/tag: `[label]` or `[label summary]`

This reduces scan cost and keeps the important number spatially attached to the modifier explaining it.

---

## 3. Contractual constraints

The implementation must obey the following rules.

### 3.1 Architecture constraints

- UI observes semantic state only.
- UI must not mutate ECS state.
- `.tsx` files must not contain business logic.
- Logic must live in resolver, formatter, equality, hook, or service files.
- Context must not be used for frequently changing data.
- Emotion styled components must be used for styling.
- Theme tokens must be used instead of hard-coded magic values.
- Reusable runtime-selection card display code belongs under `src/ui/runtime/world/selection/card-display/` because it depends on runtime selection mechanisms and is not a generic UI library component.
- Existing `src/ui/lib/**` atoms must be reused where possible.
- Files must stay below the hard line limit. If a file would exceed the limit, split by responsibility.

### 3.2 Rendering constraints

- Parent lens cards must not rerender for routine current-value changes when the visible value can be updated through `EntityStateLinkProvider`.
- Static capsule shell render must be separate from live text/bar mutation.
- Live text and live progress must use the existing entity-state-link mechanism.
- Hover styling must be CSS-driven and must not use React hover state.
- Click affordance must be deterministic: if an element has a click action, it displays an `ⓘ` icon at the top right and uses the interactive hover treatment.
- Tooltip-only elements do not show the `ⓘ` icon.
- Nested click targets are forbidden. If a section title and its child capsules are both actionable, only the section title surface may own the section action.

### 3.3 Testing constraints

- Logic helpers must be unit tested.
- UI components must have view tests for smoke rendering, visible content, and interaction wiring.
- Rendering optimization must be tested with a runtime test double and render-count assertions.
- Tests must use Given / When / Then structure.
- Tests must use factories or test utilities rather than repeated boilerplate.
- Tests must verify behavior, not implementation details.

---

## 4. Existing code facts this design depends on

### 4.1 Lens selection

`selectionLensMap.ts` selects these lenses in priority order:

1. Cave
2. Body
3. Transfer
4. Job
5. Resource
6. Display

The replacement must preserve this map and must not change lens matching semantics.

### 4.2 Existing runtime invalidation and live value mechanisms

The design must reuse these existing mechanisms:

- `src/ui/runtime/hooks/useImperativeRuntimeDerivedValue.ts`
- `src/ui/runtime/hooks/useRuntimeSelector.ts`
- `src/ui/runtime/hooks/useRuntimeRevisionToken.ts`
- `src/ui/runtime/world/entity-state-link/useEntityTextRef.ts`
- `src/ui/runtime/world/entity-state-link/useEntityBarRef.ts`
- `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`
- `src/ui/runtime/world/entity-state-link/entityStateLinkRuntime.ts`
- `src/ui/runtime/world/entity-state-link/pathResolvers.ts`
- `src/ui/runtime/world/entity-state-link/valueMath.ts`

`useRuntimeSelector` still causes the React caller to render when its revision token changes. For cards whose common updates are handled by entity-state-link refs, use `useImperativeRuntimeDerivedValue` instead.

### 4.3 Existing UI atoms to reuse

The design must reuse:

- `src/ui/lib/atoms/card/Card.tsx`
- `src/ui/lib/atoms/game-icon/GameIcon.tsx`
- `src/ui/lib/atoms/rich-text/RichText.tsx`
- `src/ui/lib/atoms/tooltip/SmartTooltip.tsx`
- `src/ui/lib/atoms/fill-bar/FillBar.tsx` where a capsule needs a microbar
- `src/ui/lib/atoms/button/Button.tsx` for existing assignment actions
- `src/ui/lib/atoms/modal/Modal.tsx` for existing body selection modal

### 4.4 Existing domain facts

Body facts:

- `BodyComponentSchema` defines `xp`, `xpRate`, `level`, `baseAttributes`, `attributes`, `passport`, `traits`, `habiti`, `health`, and `maxHealth`.
- `baseAttributes` are the canonical stats mutated by leveling.
- `attributes` are effective stats.
- `xpRate` controls XP gain.
- `health` and `maxHealth` are stored on the body.

Modifier facts:

- `extractUpkeepModifiers` produces resource upkeep modifiers from state keys matching upkeep-rate naming.
- `extractPowerModifiers` produces work-speed modifiers from `powerSink.efficiency`.
- `extractCaveAttributeModifiers` computes body attribute modifiers as `body.attributes[attr] - body.baseAttributes[attr]`.
- `extractTraits` produces trait effect labels from trait definitions.

Habiti facts:

- `resolveHabitiDisplayEntries` already returns label, description, summary, ownership flag, and effect descriptions.
- Body cards use Habiti mode `body`.
- Cave cards use Habiti mode `cave` and currently force gold display for cave-owned Habiti/Understanding.

Storage facts:

- `resolveStorageAbilityBars` already resolves visible storage bar models from display progress bars and state entries.
- It also includes decay text, entity text bindings, tooltip lines, colors, icon IDs, and resource names.
- The new card-display system must consume these models or adapt them rather than reimplementing display-bar discovery.

---

## 5. What

### 5.1 New component taxonomy

#### Atoms

Atoms are visual primitives. They contain no game semantics.

| Atom | Responsibility |
| --- | --- |
| `InfoAffordance` | Renders the `ⓘ` marker. Rendered only by clickable wrappers. |
| `InteractiveFrame` | Applies click handling, CSS hover treatment, and `InfoAffordance`. No game-specific behavior. |
| `CapsuleFrame` | Applies capsule skin: shape, border, background, padding. |
| `CardDisplayText.styles` | Centralizes title, section title, value, modifier, rate, muted, and description typography. |
| `CapsuleMicrobar` | Renders an optional tight fill indicator inside a capsule using existing live bar binding semantics. |

#### Molecules

Molecules combine atoms and existing UI atoms into reusable display pieces.

| Molecule | Responsibility |
| --- | --- |
| `ValueCapsule` | Renders icon/title/current/max/effects/rate/tooltip/click action with one skin. |
| `LiveValueText` | Renders a span controlled by `useEntityTextRef`. No React render on value ticks. |
| `ValueRail` | Renders a horizontal or wrapping list of `ValueCapsule`s. |
| `CapsuleList` | Renders tag-like capsules such as Habiti, Understanding, cave-owned entries, or filters. |
| `CardTitleBlock` | Renders optional icon/avatar and large title text with optional tooltip/action. |
| `CardDescriptionBlock` | Renders rich text description, defaulting to light grey italic narration. |
| `Section` | Renders a section title and section body layout. Section title may be actionable. |

#### Organisms

Organisms are reusable card regions composed from molecules.

| Organism | Responsibility |
| --- | --- |
| `SelectionCardShell` | Outer card surface, vertical spacing, optional variant/padding. |
| `CardModelView` | Generic renderer for a complete `SelectionCardModel`. |
| `IdentityBlock` | Title area for body, cave, job, resource, transfer, and display cards. |
| `CapabilityBlock` | Attribute / demand / contribution row. |
| `LiveStateBlock` | Level, XP, health, population, comfort, cycle, or storage live values. |
| `TagBlock` | Habiti, Understanding, filters, status tags. |
| `EffectsBlock` | Residual effects that do not have a local target value. |
| `DescriptionBlock` | Bottom description/flavor block. |

### 5.2 Value capsule grammar

A `ValueCapsule` renders this ordered grammar:

```pseudocode
optional icon
optional title
optional current
optional / max
zero or more effect segments
optional suffix
```

Examples:

```pseudocode
[Body icon] 14 (+13)
[Mind icon] 21 (+20)
[XP icon] 60/100 +1/s
[Health icon] 43/100 -1/3s
[Food icon] -1/s
Human
Human +10
```

Attribute composition effects use parentheses because they explain the current value:

```pseudocode
14 (+13)
```

Rates do not use parentheses because they describe movement over time:

```pseudocode
60/100 +1/s
43/100 -1/3s
```

If multiple effects target one value, all effect segments are rendered in deterministic order. The capsule renderer does not aggregate string effects.

### 5.3 Capsule skins

The skin system is visual only. Domain resolvers decide which skin to use.

| Skin | Visual contract |
| --- | --- |
| `plain` | No pill, no outline, no background. |
| `value` | No outline, no background. Used for primary card values. |
| `modifier` | Pill, grey outline, dark grey background. |
| `ownedHabitus` | Pill, dark grey outline, no background. |
| `unownedHabitus` | Pill, gold outline, no background. |
| `caveOwned` | Pill, gold outline, no background. |
| `warning` | Pill or value capsule with warning emphasis. |
| `danger` | Pill or value capsule with danger emphasis. |
| `success` | Pill or value capsule with positive emphasis. |

Additional skins may be added later only by extending the skin enum and skin styles. Existing skins must not be repurposed.

### 5.4 Action and tooltip contract

Every display component with a click action must:

- Render inside `InteractiveFrame`.
- Display `InfoAffordance` in the top right.
- Apply the shared hover treatment.
- Call only its supplied action handler.

Every display component with tooltip content must:

- Use `SmartTooltip`.
- Render no `InfoAffordance` unless it also has a click action.

Codex note:

- This design supports action descriptors and callbacks.
- This design does not implement Codex navigation.
- Current implementation may pass no actions.
- Future Codex integration must supply an action handler without changing capsule visual behavior.

---

## 6. Data interfaces

This section defines interfaces in prose. Field names are exact. Types are expressed descriptively to avoid implementation code.

### 6.1 `SelectionCardModel`

**Responsibility:** Complete render model for one selection lens card.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable model ID. Usually the selected entity ID prefixed by the lens ID. |
| `entityId` | yes | Runtime entity ID used by conditional notices and live bindings. |
| `title` | no | `CardTitleModel`. Omitted only when a card intentionally has no title. |
| `badges` | no | Stable title-adjacent display badges such as `Permanent` or suspicious activity. |
| `conditionalNoticeEntityId` | no | Entity ID passed to existing `ConditionalActivationNotice`. |
| `sections` | yes | Ordered list of `CardSectionModel`. Empty list is allowed. |
| `description` | no | `CardDescriptionModel`. Rendered after sections unless a resolver explicitly places description as a section. |
| `emptyText` | no | Text shown when the card has no meaningful section content. |

**Rules:**

- The model must not contain ECS entities.
- The model must not contain mutable runtime references.
- The model may contain click action descriptors or callbacks supplied by the card view layer.
- Field values used for frequent current-value updates must be represented as live bindings, not as static text.

### 6.2 `CardTitleModel`

**Responsibility:** Title display for any lens card.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable key. |
| `iconId` | no | Game icon ID. Used for cave/job/resource/transfer/display cards. |
| `avatar` | no | Avatar model. Used by body cards when body avatar display is required. |
| `text` | yes | Rich text or plain text title content. |
| `tooltip` | no | Tooltip model. |
| `action` | no | Optional click action. Presence triggers `ⓘ`. |

**Rules:**

- If `avatar` exists, `iconId` must not be rendered.
- If both are supplied by mistake, the renderer must prefer `avatar` and ignore `iconId`.
- The title renderer must not resolve runtime data. Resolvers supply all display data.

### 6.3 `CardDescriptionModel`

**Responsibility:** Rich-text description display.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable key. |
| `text` | yes | Rich text source string. |
| `variant` | no | Defaults to `narration`. |
| `tooltip` | no | Tooltip model. |
| `action` | no | Optional click action. Presence triggers `ⓘ`. |
| `maxLines` | no | Optional visual clamp. Omit for current behavior. |

### 6.4 `CardSectionModel`

**Responsibility:** One titled or untitled card section.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable key. |
| `title` | no | Section title text. |
| `titleIconId` | no | Optional title icon. |
| `tooltip` | no | Tooltip on section title. |
| `action` | no | Optional section-title click action. Presence triggers `ⓘ` on title only. |
| `layout` | yes | One of `row`, `wrap`, `column`, `grid`. |
| `density` | yes | One of `tight`, `normal`. |
| `capsules` | no | Ordered list of `ValueCapsuleModel`. |
| `customContentKind` | no | Named escape hatch for existing interactive content such as assignment action buttons. |

**Rules:**

- A section with `capsules` renders through `ValueRail` or `CapsuleList` based on layout.
- `customContentKind` must be used only for interactive content that is not a display capsule.
- Section content itself is not clickable. Only the section title may receive the section action.

### 6.5 `ValueCapsuleModel`

**Responsibility:** One semantic value, tag, or effect.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable semantic key. Must not be an array index. |
| `skin` | yes | Capsule skin. |
| `iconId` | no | Game icon ID. |
| `title` | no | Optional label before value. |
| `value` | no | `CapsuleValueModel`. |
| `effects` | yes | Ordered list of `CapsuleEffectSegmentModel`. Empty list allowed. |
| `suffix` | no | Extra non-effect text after effects. |
| `tooltip` | no | Tooltip model. |
| `action` | no | Optional click action. Presence triggers `ⓘ`. |
| `progress` | no | Optional `CapsuleProgressModel` for microbar fill. |
| `emphasis` | no | `normal`, `muted`, `positive`, `warning`, or `danger`. Defaults to `normal`. |
| `testId` | no | Test ID only where required by existing contract tests. |

**Rules:**

- `effects` are displayed in supplied order.
- No effect segment is silently dropped.
- Renderer may wrap the rail but may not truncate capsule text.
- If `value` is omitted, capsule displays icon/title/effects/suffix only.

### 6.6 `CapsuleValueModel`

**Responsibility:** Static or live displayed value.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `text` | conditional | Static display text. Required if `binding` is absent. |
| `binding` | conditional | Live text binding. Required if `text` is absent. |
| `maxText` | no | Static max text when the value is not bound as a fraction. |
| `ariaLabel` | no | Accessibility label. |

**Rules:**

- Exactly one of `text` or `binding` must be present.
- Current/max live pairs should use one live binding rather than separate independently-rendered spans when possible.

### 6.7 `CapsuleEffectSegmentModel`

**Responsibility:** One modifier/rate segment adjacent to a value.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable key. |
| `text` | yes | Already-formatted effect text, such as `(+13)`, `+1/s`, or `-1/3s`. |
| `tone` | yes | `positive`, `negative`, or `neutral`. |
| `sourceLabel` | no | Human-readable source used in tooltip. |
| `targetKey` | no | Target value key used for diagnostics/tests. |

**Rules:**

- Formatting occurs before the renderer.
- Renderer only applies tone and typography.

### 6.8 `CapsuleProgressModel`

**Responsibility:** Optional microbar under or behind capsule value.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable live bar binding ID. |
| `entityId` | yes | Runtime entity ID. |
| `valuePath` | yes | Existing entity-state-link path. |
| `maxPath` | conditional | Max path when max is stored on entity. |
| `maxValue` | conditional | Static max when max path is unavailable. |
| `color` | no | Theme-derived color or existing resolved color. |

**Rules:**

- Exactly one of `maxPath` or `maxValue` must be present.
- Progress updates must use `useEntityBarRef`.

### 6.9 `TooltipModel`

**Responsibility:** Tooltip content data.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `title` | no | Optional rich text title. |
| `lines` | no | Ordered rich text lines. |
| `content` | no | React node escape hatch when existing tooltip content is already a node. |
| `placement` | no | SmartTooltip placement. Defaults to current SmartTooltip default. |

**Rules:**

- Resolvers should prefer `title` and `lines`.
- `content` is allowed only when migrating existing tooltip bodies would otherwise duplicate rich-text composition logic.

### 6.10 `CardDisplayAction`

**Responsibility:** Optional action descriptor or callback for clickable display items.

**Fields:**

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Stable action ID. |
| `label` | yes | Human-readable action label. |
| `kind` | yes | Initially `callback` or `codex`. |
| `entryId` | conditional | Required for `codex`. |
| `callback` | conditional | Required for `callback`. |

**Rules:**

- `codex` actions may be modeled now but are not wired unless a caller supplies a dispatcher.
- `callback` actions must not mutate ECS directly.

---

## 7. How

## 7.1 Add shared card-display files

### `src/ui/runtime/world/selection/card-display/cardDisplayTypes.ts`

**Responsibility:** Define all model and prop types for the card-display system.

**Logic:** None. Types only.

**Interface:** Defines the exact model names from section 6:

- `SelectionCardModel`
- `CardTitleModel`
- `CardDescriptionModel`
- `CardSectionModel`
- `ValueCapsuleModel`
- `CapsuleValueModel`
- `CapsuleEffectSegmentModel`
- `CapsuleProgressModel`
- `TooltipModel`
- `CardDisplayAction`
- `CapsuleSkin`
- `CardDisplayTone`
- `CardSectionLayout`
- `CardSectionDensity`

**Tests:** None required for type-only file.

---

### `src/ui/runtime/world/selection/card-display/cardDisplayFormatters.ts`

**Responsibility:** Centralize display formatting used by card-display resolvers.

**Logic:**

- Format compact numbers using existing `formatCompactNumber` where card displays currently use it.
- Format fraction text as `current/max`.
- Format static attribute modifier text as `(+n)` or `(-n)`.
- Format rate text as `+n/s`, `-n/s`, `+n/5s`, or `-n/5s` from already-known amount and interval inputs.
- Format effect segment tone from sign.

**Interface:**

- `formatCapsuleNumber(value)` returns display string.
- `formatCapsuleFraction(current, max)` returns display string.
- `formatAttributeModifier(value)` returns empty value for zero and parenthesized signed value for nonzero.
- `formatEffectSegmentText(valueText, intervalText, style)` returns display text.
- `resolveEffectTone(text)` returns positive, negative, or neutral.

**Tests:**

- Positive, negative, zero, fractional, large-number, and invalid-number cases.
- Zero attribute modifiers return no segment.
- Rate formatting preserves interval text exactly.

---

### `src/ui/runtime/world/selection/card-display/cardDisplayEquality.ts`

**Responsibility:** Compare card display models so derived hooks rerender only when static display structure or non-live semantic fields change.

**Logic:**

- Compare cards by stable IDs and field values.
- Compare sections by ID/order/title/layout/density/capsules.
- Compare capsules by ID/skin/icon/title/static value/effect text/tooltip/action/progress binding metadata.
- For live text bindings, compare binding identity and paths, not current runtime values.
- For progress bindings, compare entity ID, value path, max path/max value, and color.
- Do not compare current values that are intentionally handled by entity-state-link refs.

**Interface:**

- `selectionCardModelEqual(left, right)`
- `cardSectionModelsEqual(left, right)`
- `valueCapsuleModelsEqual(left, right)`

**Tests:**

- Equal models with unchanged live bindings are equal.
- Changing static title is unequal.
- Changing a capsule skin is unequal.
- Changing current value text in a static capsule is unequal.
- Changing only live-bound entity state is not represented in the model and therefore does not trigger inequality.

---

### `src/ui/runtime/world/selection/card-display/resolveAnchoredEffects.ts`

**Responsibility:** Split modifiers and trait effects into local target effects and residual effects.

**Logic:**

- Accept existing `EntityModifierLabel[]` and `EntityTraitSummary[]`.
- Output an anchored map keyed by target value key and a residual list.
- Attribute cave modifiers with target `body`, `mind`, or `social` are anchored to their respective attribute capsules.
- Health trait effects target `health` and anchor to the health capsule.
- XP-rate comes from `body.xpRate`, not from modifier analysis.
- Upkeep modifiers for `food` and `heat` remain residual unless the current card has a first-class local `food` or `heat` value capsule.
- Power work-speed modifiers remain residual.
- Trait effects that target a value without a matching local capsule remain residual.

**Interface:**

- `resolveAnchoredEffects(input)` returns:
  - `byTarget`: map from target key to ordered effect segments.
  - `residualEffects`: ordered list of `ValueCapsuleModel` with `modifier` skin.

**Ordering contract:**

1. Existing modifier order is preserved.
2. Existing trait order is preserved.
3. Modifier effects precede trait effects when both target the same value.
4. No effect is dropped.

**Tests:**

- Cave attribute modifiers anchor to attribute capsules.
- Health trait cycle anchors to health.
- Food and heat upkeep are residual for body cards.
- Food and heat can be local when a resolver declares local targets for a cave sustainment section.
- Unknown targets remain residual.
- Multiple same-target effects preserve order.

---

### `src/ui/runtime/world/selection/card-display/adaptAbilityBarsToCapsules.ts`

**Responsibility:** Convert existing `AbilityBarModel[]` to `ValueCapsuleModel[]`.

**Logic:**

- Preserve `id`, `entityId`, `valuePath`, `maxPath`, `maxValue`, `iconId`, `title`, tooltip title/lines, color, and live text binding from `AbilityBarModel`.
- Convert `valueBinding` to `CapsuleValueModel.binding`.
- Convert `valueText` to `CapsuleValueModel.text`.
- Convert `titleMetaText` into an effect segment when it represents decay/rate text.
- Convert bar fill into `CapsuleProgressModel`.
- Use `value` skin by default.

**Interface:**

- `adaptAbilityBarsToCapsules(models)` returns `ValueCapsuleModel[]`.

**Tests:**

- Live storage model becomes a capsule with live value binding and progress binding.
- Static storage model becomes a capsule with static value text.
- Tooltip lines are preserved.
- `titleMetaText` is preserved as visible adjacent effect text.

---

## 7.2 Add atoms

### `src/ui/runtime/world/selection/card-display/atoms/InfoAffordance.tsx`

**Responsibility:** Render the `ⓘ` click affordance.

**Logic:** None beyond rendering.

**Interface:**

- Props: optional `className`.
- Output: visible `ⓘ` text/icon with `aria-hidden` true unless tests require a label.

**Tests:** Covered through `InteractiveFrame` tests.

---

### `src/ui/runtime/world/selection/card-display/atoms/InteractiveFrame.tsx`

**Responsibility:** Provide shared click/hover surface behavior.

**Logic:**

- If `action` or `onClick` is absent, render a non-interactive wrapper.
- If clickable, apply button-like behavior:
  - Pointer cursor.
  - CSS hover effect.
  - Top-right `InfoAffordance`.
  - Calls supplied handler.
- Keyboard activation must trigger click for Enter and Space if rendered as a non-button element.
- Must not stop event propagation unless explicitly required by the caller.

**Interface:**

- Props:
  - `action` optional.
  - `onAction` optional.
  - `disabled` optional.
  - `children` required.
  - `className` optional.

**Tests:**

- No action renders no `ⓘ`.
- Action renders `ⓘ`.
- Click calls action handler once.
- Enter and Space activate when clickable.
- Disabled clickable frame does not call handler.

---

### `src/ui/runtime/world/selection/card-display/atoms/CapsuleFrame.tsx`

**Responsibility:** Apply capsule shape and skin.

**Logic:**

- Map `CapsuleSkin` to visual style.
- Use theme tokens only.
- No semantic logic.

**Interface:**

- Props:
  - `skin` required.
  - `emphasis` optional.
  - `children` required.
  - `className` optional.

**Tests:**

- Smoke render for every skin.
- Skin class/style marker changes when skin changes.

---

### `src/ui/runtime/world/selection/card-display/atoms/CardDisplayText.styles.ts`

**Responsibility:** Central typography for the card-display system.

**Logic:** None. Styled components only.

**Interface:** Exports styled text atoms:

- `TitleText`
- `SectionTitleText`
- `DescriptionText`
- `ValueText`
- `MaxText`
- `EffectText`
- `RateText`
- `MutedText`

**Tests:** Covered by view tests that assert content is visible.

---

### `src/ui/runtime/world/selection/card-display/atoms/CapsuleMicrobar.tsx`

**Responsibility:** Render optional tiny progress fill inside a capsule.

**Logic:**

- Uses `useEntityBarRef` with `CapsuleProgressModel`.
- Uses existing `FillBar` if it can render track-only without duplicating value text.
- If `progress` is absent, renders nothing.
- Initial current/max values must come from the model if available; otherwise initial fill may be zero until the first entity-state-link sync.

**Interface:**

- Props:
  - `progress` required.

**Tests:**

- Registers a progress binding through `EntityStateLinkProvider`.
- Fill updates after mutation without rerendering the capsule parent.

---

## 7.3 Add molecules

### `src/ui/runtime/world/selection/card-display/molecules/LiveValueText.tsx`

**Responsibility:** Render live text through entity-state-link.

**Logic:**

- Uses `useEntityTextRef`.
- Renders an empty span that entity-state-link fills.
- No runtime reads in render.

**Interface:**

- Props:
  - `binding` required.
  - `fallbackText` optional for server/first-render display.

**Tests:**

- Initial sync displays bound text.
- Runtime mutation updates text without parent rerender.

---

### `src/ui/runtime/world/selection/card-display/molecules/ValueCapsule.tsx`

**Responsibility:** Render one capsule model.

**Logic:**

- Wrap with `SmartTooltip` only if tooltip exists.
- Wrap with `InteractiveFrame` to apply click behavior.
- Render `CapsuleFrame`.
- Render `GameIcon` when `iconId` exists.
- Render title when present.
- Render static or live value.
- Render all effect segments in supplied order.
- Render suffix when present.
- Render optional microbar.

**Interface:**

- Props:
  - `model` required.
  - `onAction` optional.

**Tests:**

- Renders icon/title/value/max/effects/suffix.
- Renders live value binding through `LiveValueText`.
- Renders tooltip when provided.
- Renders `ⓘ` only when action exists.
- Calls action handler when clicked.
- Does not drop multiple effect segments.

---

### `src/ui/runtime/world/selection/card-display/molecules/ValueRail.tsx`

**Responsibility:** Render ordered capsules in a row/wrap/grid.

**Logic:**

- Renders each capsule with its stable `id` key.
- Applies layout based on section layout/density.

**Interface:**

- Props:
  - `capsules` required.
  - `layout` required.
  - `density` required.
  - `onAction` optional.

**Tests:**

- Preserves supplied order.
- Renders empty list as null.
- Passes actions to child capsules.

---

### `src/ui/runtime/world/selection/card-display/molecules/CapsuleList.tsx`

**Responsibility:** Render tag-like capsule lists.

**Logic:**

- Delegates capsule rendering to `ValueCapsule`.
- Uses wrapping layout by default.

**Interface:**

- Same as `ValueRail`, with default layout `wrap` and density `tight`.

**Tests:**

- Renders Habiti-like capsules.
- Preserves ownership skins.

---

### `src/ui/runtime/world/selection/card-display/molecules/CardTitleBlock.tsx`

**Responsibility:** Render card title model.

**Logic:**

- If `avatar` exists, renders body avatar presentation.
- Else if `iconId` exists, renders `GameIcon`.
- Renders title text through `RichText` when text is rich text, otherwise plain title text atom.
- Applies tooltip and click action contracts.

**Interface:**

- Props:
  - `model` required.
  - `onAction` optional.

**Tests:**

- Renders text-only title.
- Renders icon title.
- Renders body avatar title.
- Renders clickable `ⓘ` only when action exists.

---

### `src/ui/runtime/world/selection/card-display/molecules/CardDescriptionBlock.tsx`

**Responsibility:** Render description model.

**Logic:**

- Uses existing `RichText`.
- Defaults to narration styling.
- Applies tooltip and click action contracts.

**Interface:**

- Props:
  - `model` required.
  - `onAction` optional.

**Tests:**

- Renders rich text description.
- Renders nothing for absent/empty model.
- Click behavior follows action contract.

---

### `src/ui/runtime/world/selection/card-display/molecules/Section.tsx`

**Responsibility:** Render one section title and content.

**Logic:**

- Renders title if present.
- Title surface may be tooltip/action-enabled.
- Body renders capsules through `ValueRail` or `CapsuleList`.
- Body may render a named custom slot supplied by `CardModelView`.
- Section body itself is not clickable.

**Interface:**

- Props:
  - `model` required.
  - `customSlots` optional map.
  - `onAction` optional.

**Tests:**

- Renders titled section.
- Renders untitled section.
- Renders custom slot for known `customContentKind`.
- Does not make body clickable for section action.

---

## 7.4 Add organisms

### `src/ui/runtime/world/selection/card-display/organisms/SelectionCardShell.tsx`

**Responsibility:** Shared outer shell for all lens cards.

**Logic:**

- Uses existing `Card` through current `SelectionCardRoot` behavior or replaces `SelectionCardRoot` with equivalent styled card shell.
- Owns vertical spacing and padding.
- No card-specific logic.

**Interface:**

- Props:
  - `children` required.
  - `padding` optional.
  - `variant` optional.

**Tests:**

- Smoke render.
- Applies variant and padding.

---

### `src/ui/runtime/world/selection/card-display/organisms/CardModelView.tsx`

**Responsibility:** Render a complete `SelectionCardModel`.

**Logic:**

- If model is null, render null.
- Render `SelectionCardShell`.
- Render `CardTitleBlock` if model has title.
- Render model badges.
- Render existing `ConditionalActivationNotice` when `conditionalNoticeEntityId` exists.
- Render sections in order.
- Render description last when present.
- Render `emptyText` when there are no sections and no description.

**Interface:**

- Props:
  - `model` required or null.
  - `runtime` required when conditional notice is needed.
  - `customSlots` optional.
  - `onAction` optional.

**Tests:**

- Null model renders null.
- Full model renders title, sections, description.
- Conditional notice is rendered with supplied entity ID.
- Section order is preserved.

---

### `src/ui/runtime/world/selection/card-display/organisms/IdentityBlock.tsx`

**Responsibility:** Optional semantic wrapper for title area when a card needs identity-specific spacing.

**Logic:** Delegates to `CardTitleBlock` and badge rendering.

**Interface:** Internal to `CardModelView` unless a card view needs explicit composition.

**Tests:** Covered through `CardModelView` and `CardTitleBlock` tests.

---

### `src/ui/runtime/world/selection/card-display/organisms/CapabilityBlock.tsx`

**Responsibility:** Render capability sections such as attributes, power usage, or per-body bonuses.

**Logic:** Delegates to `Section` with row/grid layout.

**Interface:** Model-only.

**Tests:** Covered through `Section` and lens card tests.

---

### `src/ui/runtime/world/selection/card-display/organisms/LiveStateBlock.tsx`

**Responsibility:** Render live stat sections such as level/XP/health/population/cycle/storage.

**Logic:** Delegates to `Section` and `ValueCapsule`; all current-value updates use live bindings when possible.

**Interface:** Model-only.

**Tests:** Live rendering test required.

---

### `src/ui/runtime/world/selection/card-display/organisms/TagBlock.tsx`

**Responsibility:** Render Habiti/Understanding/tag sections.

**Logic:** Delegates to `CapsuleList`.

**Interface:** Model-only.

**Tests:** Covered through `CapsuleList` and lens card tests.

---

### `src/ui/runtime/world/selection/card-display/organisms/EffectsBlock.tsx`

**Responsibility:** Render residual effects that are not anchored to local value capsules.

**Logic:** Delegates to `ValueRail` using `modifier` skin capsules.

**Interface:** Model-only.

**Tests:** Verify residual effects render and anchored effects do not duplicate.

---

### `src/ui/runtime/world/selection/card-display/organisms/DescriptionBlock.tsx`

**Responsibility:** Render the bottom description block.

**Logic:** Delegates to `CardDescriptionBlock`.

**Interface:** Model-only.

**Tests:** Covered through `CardDescriptionBlock` and lens card tests.

---

## 7.5 Extend entity-state-link text support

### `src/ui/runtime/world/entity-state-link/types.ts`

**Responsibility change:** Support generic live text required by `ValueCapsule` without creating card-specific hooks.

**Current facts:** Existing text binding kinds are `compact-fraction`, `remaining-duration-ms`, and `cycle-countdown`.

**Required change:** Add a generic numeric text binding kind.

**New binding behavior:**

```pseudocode
kind: numeric-text
entityId: target entity
valuePath: path to numeric value or state entry
format: one of integer, floor, compact, percent, signed-rate
fallbackText: optional
```

**Rules:**

- Existing binding kinds must remain unchanged.
- Existing tests for compact fraction, remaining duration, and cycle countdown must still pass.
- Numeric formatter choices must be closed and explicit. No arbitrary formatting callback is allowed inside the binding because bindings are data and must remain stable/comparable.

**Tests:**

- Numeric text reads number path.
- Numeric text reads `{ value }` state entry path.
- Percent formatter renders percent using the existing cave comfort convention.
- Invalid/missing values render fallback or empty text deterministically.

---

### `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`

**Responsibility change:** Resolve and update the new numeric text binding kind.

**Logic change:**

- Extend `resolveText` to handle `numeric-text`.
- Extend equality to include numeric formatter and path.
- Preserve existing text sync interval and dirty-entity handling.

**Interface:** No public hook changes. `useEntityTextRef` continues to accept `EntityTextBinding`.

**Tests:** Add runtime-level tests for numeric text updates and equality.

---

## 7.6 Body card replacement

### `src/ui/runtime/world/selection/body/bodyCardTypes.ts`

**Responsibility change:** Replace raw body display data shape with data needed to build a `SelectionCardModel`, or export `BodyCardModel` as an alias to `SelectionCardModel`.

**Required fields before model resolution:**

- `subjectId`
- `showIdentityTitle`
- `displayName`
- `description`
- `fallbackIconId`
- `liveLevel`
- `liveXp`
- `liveXpMax`
- `liveXpRate`
- `liveHealth`
- `liveMaxHealth`
- `baseAttributes`
- `attributes`
- `modifiers`
- `traits`
- `habiti`

**Logic:** None.

**Interface:** Type declarations only.

---

### `src/ui/runtime/world/selection/body/bodyCardSelectors.ts`

**Responsibility change:** Add selectors for body fields required by local value capsules.

**Add selectors:**

- `selectBodyXpRate`
- `selectBodyBaseAttributes`

**Rules:**

- Existing selector defaults remain unchanged.
- `selectBodyXpRate` defaults to `1`, matching `BodyComponentSchema`.
- `selectBodyBaseAttributes` must return the body component base attributes when present.

**Tests:** Update selector tests if present; otherwise covered by resolver tests.

---

### `src/ui/runtime/world/selection/body/resolveBodyCardData.ts`

**Responsibility change:** Resolve body semantic data and construct the body card model.

**Logic:**

1. Resolve selected body subject using existing `resolveBodySelectionTargetId`.
2. Resolve target entity from runtime or fallback entity.
3. Resolve identity data using existing selectors and description resolver.
4. Read `xpRate`, `baseAttributes`, effective `attributes`, health, XP, and level.
5. Analyze modifiers and traits with existing `analyzeEntityState`.
6. Resolve Habiti with existing `resolveHabitiDisplayEntries`.
7. Build card model sections:
   - Title: body avatar + display name when `showIdentityTitle` is true.
   - Conditional notice: subject ID.
   - Capabilities section: Body/Mind/Social capsules as `[icon] effective (effective - base)`.
   - Live section: Level, XP current/max with XP rate, Health current/max with anchored health effects.
   - Habiti section: Habiti capsules using ownership skins.
   - Other Effects section: residual effects only.
   - Description block: rich text description at bottom.
8. Do not include anchored cave attribute modifiers in the residual effects section.
9. Do not include anchored health effects in the residual effects section unless the same effect also has another target.

**Interfaces:**

- Input remains `(entity, runtime)`.
- Output becomes `SelectionCardModel | null` or `BodyCardData` containing `model: SelectionCardModel`.
- The chosen output must be used consistently by `useBodyCardData`, `BodyCardView`, and tests.

**Tests:**

- Renders identity, permanent badge, attribute capsules with modifiers, XP, health, Habiti, residual upkeep, and description.
- Health effect appears next to health when target is health.
- Cave attribute effects appear next to attributes and do not appear in residual effects.
- Non-body selections still render null.

---

### `src/ui/runtime/world/selection/body/bodyCardHydration.ts`

**Responsibility change:** Compare the body card model without causing rerenders for live text-only updates.

**Logic:**

- Hydration plan still includes selected entity, subject entity, and `sys_world` because Habiti ownership and conditional activation may depend on them.
- Equality delegates to `selectionCardModelEqual`.
- Static model includes live bindings for XP/health where possible, so frequent changes to XP/health values do not change the model.
- Level changes may rerender the model because level can change XP max and section content.
- Attribute changes rerender the model.
- Habiti/trait/modifier changes rerender the model.

**Tests:**

- XP current-value mutation does not change model when live binding covers it.
- Level mutation changes model.
- Attribute mutation changes model.
- Habiti ownership changes model.

---

### `src/ui/runtime/world/selection/body/useBodyCardData.ts`

**Responsibility change:** Use optimized derived-value hook.

**Logic:**

- Replace `useRuntimeSelector` with `useImperativeRuntimeDerivedValue` when the model uses live bindings for current XP/health.
- Structural dependencies are entity and runtime.
- Comparator is `selectionCardModelEqual` or body-specific wrapper.

**Interface:**

- Input remains `(entity, runtime)`.
- Output becomes `SelectionCardModel | null` or body wrapper matching the resolver output.

**Tests:**

- Add a live body-card test mirroring `ResourceCard.live.test.tsx`: XP/health text updates without rerendering the card view.

---

### `src/ui/runtime/world/selection/body/BodyCardView.tsx`

**Responsibility change:** Render generic model.

**Logic:**

- If data/model is null, render null.
- Render `CardModelView`.
- No body-specific display logic.

**Interface:** Props remain equivalent from `BodyCard.tsx` perspective.

---

### `src/ui/runtime/world/selection/body/BodyCard.tsx`

**Responsibility change:** Remains the lens adapter.

**Logic:**

- Calls `useBodyCardData`.
- Passes model to `BodyCardView`.

**Interface:** `SelectionCardProps` unchanged.

---

## 7.7 Cave card replacement

### `src/ui/runtime/world/selection/cave/caveCardTypes.ts`

**Responsibility change:** Support cave model generation.

**Required semantic fields:**

- `label`
- `targetId`
- `liveLevel`
- `liveXp`
- `liveXpMax`
- `livePopulation`
- `attributes`
- `liveComfort`
- `habiti`
- `understanding`
- `modifiers`
- `traits`
- sustainment storage models from `resolveStorageAbilityBars` or equivalent explicit food/heat capsules

**Interface:** May become `CaveCardData` with `model: SelectionCardModel` or direct `SelectionCardModel`.

---

### `src/ui/runtime/world/selection/cave/resolveCaveCardData.ts`

**Responsibility change:** Build cave card model.

**Logic:**

1. Preserve existing label resolution.
2. Preserve existing level/XP/population resolution.
3. Preserve existing effective cave attribute resolution with `resolveEffectiveCaveAttributes`.
4. Preserve existing Habiti and Understanding resolution.
5. Preserve existing `analyzeEntityState` for residual effects.
6. Build model sections:
   - Title: cave name.
   - Conditional notice: cave target ID.
   - Live section: level, XP, population, comfort.
   - Sustainment section: food and heat current/max capsules using live bindings and progress bindings.
   - Capabilities section: per-body bonus Body/Mind/Social capsules. Value is the effective per-body bonus after comfort. Effect segment shows the pre-comfort base in parentheses, preserving current tooltip semantics.
   - Habiti section: cave-owned/known Habiti capsules using `caveOwned` or `unownedHabitus` skin according to existing `isOwnedByCave` and current `showAllGold` behavior.
   - Understanding section: capsules with cave-owned skin.
   - Other Effects section: residual modifiers and traits not anchored to local values.
   - Description: existing cave description text.
7. Do not duplicate food/heat sustainment effects in residual effects if they are shown in the Sustainment section.

**Interfaces:** Input remains `(entity, runtime)`. Output follows chosen model shape.

**Tests:**

- Renders cave title and existing cave description.
- Renders level, XP, population, comfort.
- Renders food and heat as capsules with live text.
- Renders per-body bonus attributes.
- Renders Habiti and Understanding.
- Food/heat text updates without card rerender.

---

### `src/ui/runtime/world/selection/cave/caveCardHydration.ts`

**Responsibility change:** Compare cave model using shared equality.

**Logic:**

- Keep current dependency coverage required for cave state, Habiti, Understanding, and blueprint-derived descriptions.
- Exclude live values that are covered by entity-state-link bindings from equality-triggered rerenders.

**Tests:**

- Food current-value mutation updates text without model inequality.
- Comfort mutation changes model only if comfort is rendered as static text; if comfort is live-bound, it must not rerender for current-value text updates.
- Habiti ownership mutation changes model.

---

### `src/ui/runtime/world/selection/cave/CaveCardView.tsx`

**Responsibility change:** Render `CardModelView` only.

**Logic:**

- No direct calls to `useEntityBarRef`.
- No direct cave section imports.
- Pass model to generic renderer.

---

### `src/ui/runtime/world/selection/cave/CaveCard.tsx`

**Responsibility change:** Remains the lens adapter.

**Logic:** Use optimized derived model hook if not already doing so.

---

## 7.8 Resource card replacement

### `src/ui/runtime/world/selection/resolveResourceCardData.ts`

**Responsibility change:** Build resource card model using existing storage resolution.

**Logic:**

1. Preserve label and description resolution.
2. Preserve `resolveStorageAbilityBars`.
3. Convert storage models with `adaptAbilityBarsToCapsules`.
4. Build model:
   - Title: resource label.
   - Conditional notice: entity ID.
   - Storage section: storage capsules.
   - Description: visible entity description if present.
   - Empty text: `No visible storage.` when no storage models exist.

**Interface:** Output follows chosen model shape.

**Tests:**

- Existing ResourceCard tests updated to assert same visible label/description/storage values through capsules.
- Existing live resource-card test remains and must still assert no rerender on current-value update.

---

### `src/ui/runtime/world/selection/resourceCardHydration.ts`

**Responsibility change:** Compare resource card model using shared equality.

**Logic:** Must preserve the current optimization: current storage value changes update live text without rerendering the view.

**Tests:** Existing live resource-card tests must pass after update.

---

### `src/ui/runtime/world/selection/useResourceCardData.ts`

**Responsibility change:** Continue to use `useImperativeRuntimeDerivedValue`.

**Logic:** Replace data resolver/equality with model resolver/equality.

---

### `src/ui/runtime/world/selection/ResourceCardView.tsx`

**Responsibility change:** Render generic model.

**Logic:** No direct `StorageAbilityDisplay` import.

---

## 7.9 Transfer card replacement

### `src/ui/runtime/world/selection/resolveTransferCardData.ts`

**Responsibility change:** Build transfer card model.

**Logic:**

1. Preserve existing payload, type, source, and target formatting.
2. Build title from existing summary.
3. Build section `Transfer` with capsules:
   - Type
   - Value
   - From
   - To
4. No live bindings are required unless future transfer values become live.

**Tests:** Existing TransferCard tests must assert summary/type/value/from/to remain visible.

---

### `src/ui/runtime/world/selection/transferCardHydration.ts`

**Responsibility change:** Compare transfer model using shared equality or preserve existing field comparison if wrapper data is kept.

**Logic:** Source/target labels must still update when source/target entity labels change.

---

### `src/ui/runtime/world/selection/TransferCardView.tsx`

**Responsibility change:** Render generic model.

**Logic:** No raw `StatRow` usage.

---

## 7.10 Display card replacement

### `src/ui/runtime/world/selection/resolveDisplayCardData.ts`

**Responsibility change:** Build display card model.

**Logic:**

1. Preserve existing label, description, and subtitle resolution.
2. Build title from label.
3. Build description from description if present.
4. If description is absent, build a section or subtitle capsule for the subtitle.
5. Preserve conditional activation notice behavior.

**Tests:** Existing DisplayCard tests must pass after expected markup changes.

---

### `src/ui/runtime/world/selection/displayCardHydration.ts`

**Responsibility change:** Compare display model using shared equality or preserve equivalent existing field comparison.

---

### `src/ui/runtime/world/selection/DisplayCardView.tsx`

**Responsibility change:** Render generic model.

**Logic:** No direct `SelectionCardRoot`, `CardHeader`, `CardTitle`, `CardSubtitle`, or raw `RichText` layout.

---

## 7.11 Job card replacement

### `src/ui/runtime/world/selection/job-card/jobCardTypes.ts`

**Responsibility change:** Support model generation for both job variants.

**Rules:**

- Keep assignment-specific action data because buttons and modals remain interactive logic outside the generic display model.
- Display content becomes a `SelectionCardModel`.
- Existing fields required for buttons/modal remain available:
  - `assignedIds`
  - `isSelectorOpen`
  - `canAssignMoreBodies`
  - `isDepleted`
  - `isInactive`

**Interface:**

- `AssignmentJobCardData` includes `model` and existing action-control fields.
- `PowerJobCardData` may be direct model wrapper with `variant: job`.

---

### `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`

**Responsibility change:** Build generic display model for assignment and power job variants.

**Power job logic:**

1. Preserve suspicious activity resolution.
2. Preserve visible label/description resolution.
3. Preserve power sink resolution.
4. Preserve efficiency and job analysis.
5. Preserve storage model resolution.
6. Preserve trait analysis.
7. Build model:
   - Title: job label.
   - Badge/capsule: suspicious activity when present.
   - Conditional notice: entity ID.
   - Power Usage section: body/mind/social demand capsules for nonzero demand. Each capsule displays `current/max`, where current is demand multiplied by live efficiency.
   - Cycle section: cycle current/max capsule and countdown capsule/segment when cycle status exists.
   - Next Cycle sections: convert existing next-cycle groups into effect capsules while preserving tooltip title/lines.
   - Storage section: storage capsules adapted from existing storage models.
   - Traits/Other Effects section: residual trait effects.
   - Description: job description.

**Assignment job logic:**

1. Preserve assigned IDs, slot logic, depleted/inactive logic, selector open logic, requirements, storage models, and suspicious activity.
2. Build model:
   - Title: assignment label.
   - Badge/capsule: suspicious activity when present.
   - Conditional notice: entity ID.
   - Requirements section: filter labels as tag capsules and minimum rows as `current/required` value capsules.
   - Storage section: storage capsules adapted from existing storage models.
   - Description: assignment description.
3. Action buttons and modal are not part of the display model. `AssignmentJobCardView` renders them after `CardModelView` using existing `Button`, `Modal`, `BodySelector`, and `useAbsorptionActions`.

**Tests:**

- Existing JobCard tests updated for generic display output.
- Assignment requirements remain visible.
- Assignment action buttons retain behavior.
- Power usage rows remain visible.
- Cycle countdown remains visible.
- Storage values update live without rerendering display shell.

---

### `src/ui/runtime/world/selection/job-card/jobCardHydration.ts`

**Responsibility change:** Compare job display model plus action-control fields.

**Logic:**

- Assignment variant equality must compare action-control fields and model equality.
- Power variant equality must compare model equality and any remaining action-control fields.
- Existing suspicious activity equality may be reused inside model equality or converted into capsule equality.
- Existing storage model equality is replaced for lens display by capsule model equality after adaptation.

**Tests:**

- Assignment selector-open changes still rerender actions/modal.
- Storage current-value changes do not rerender card display shell.
- Next-cycle group semantic changes rerender model.

---

### `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`

**Responsibility change:** Render `CardModelView` only for display content.

**Logic:** No direct `PowerMatrix`, `CycleAbilityDisplay`, `NextCycleEffectsDisplay`, `StorageAbilityDisplay`, or `TraitList` imports.

---

### `src/ui/runtime/world/selection/job-card/AssignmentJobCardView.tsx`

**Responsibility change:** Render generic display content plus existing assignment controls.

**Logic:**

- Render `CardModelView` first.
- Preserve `useAbsorptionActions`.
- Preserve Abort and Select Bodies buttons.
- Preserve `Modal` and `BodySelector` behavior.
- Do not render `AssignmentRequirementsSection` or `StorageAbilityDisplay` directly for lens display content.

---

### `src/ui/runtime/world/selection/job-card/JobCardView.tsx`

**Responsibility change:** Variant dispatcher remains.

**Logic:** Same variant decision as today.

---

### `src/ui/runtime/world/selection/job-card/JobCard.tsx`

**Responsibility change:** Use optimized derived model hook where live text/bars are handled by entity-state-link.

**Logic:** Prefer `useImperativeRuntimeDerivedValue` if current power/storage/cycle values otherwise cause unnecessary rerenders.

---

## 7.12 Shared old component replacement and deletion plan

Deletion may occur only after `rg` shows no non-test references and tests are migrated.

### Delete after body/cave/job/resource/transfer/display lens cards no longer reference them

| File | Delete condition |
| --- | --- |
| `src/ui/runtime/world/selection/body/BodyCardContent.tsx` | `BodyCardView` renders `CardModelView`. |
| `src/ui/runtime/world/selection/body/BodyIdentity.tsx` | Body title uses `CardTitleBlock` and existing body avatar mechanism. |
| `src/ui/runtime/world/selection/body/BodyXpAndLevel.tsx` | Body live stats use `ValueCapsule`. |
| `src/ui/runtime/world/selection/ability-display/HealthAbilityDisplay.tsx` | Health is rendered by body live stat capsule and no references remain. |
| `src/ui/runtime/world/selection/components/AttributesList.tsx` | Attributes are rendered by capability capsules and no references remain. |
| `src/ui/runtime/world/selection/components/ModifierList.tsx` | Residual modifiers are rendered by `EffectsBlock` and no references remain. |
| `src/ui/runtime/world/selection/components/TraitList.tsx` | Trait effects are rendered by anchored capsules or `EffectsBlock` and no references remain. |
| `src/ui/runtime/world/selection/components/EffectPill.tsx` | Effects render through `ValueCapsule`. |
| `src/ui/runtime/world/selection/components/analysisStyles.ts` | No effect pill/list references remain. |
| `src/ui/runtime/world/selection/components/HabitiList.tsx` | Habiti render through `TagBlock`/`CapsuleList`. |
| `src/ui/runtime/world/selection/components/HabitiList.styles.ts` | No `HabitiList` references remain. |
| `src/ui/runtime/world/selection/cave/CaveXpAndPop.tsx` | Cave live stats use `LiveStateBlock`. |
| `src/ui/runtime/world/selection/CaveXpAndPop.tsx` | Re-export is unused. |
| `src/ui/runtime/world/selection/cave/CaveVitalsSection.tsx` | Cave comfort uses `ValueCapsule`. |
| `src/ui/runtime/world/selection/cave/CaveSustainmentSection.tsx` | Food/heat use `ValueCapsule`. |
| `src/ui/runtime/world/selection/cave/CaveCapabilitiesSection.tsx` | Per-body bonus uses capability capsules. |
| `src/ui/runtime/world/selection/cave/LiveNumericValue.tsx` | Generic numeric text binding replaces it. |
| `src/ui/runtime/world/selection/cave/useLiveNumericValue.ts` | Generic entity-state-link text binding replaces it. |
| `src/ui/runtime/world/selection/cave/resolveDynamicRate.ts` | Delete only if no resolver still imports it. |
| `src/ui/runtime/world/selection/job-card/PowerMatrix.tsx` | Power usage uses capability capsules. |
| `src/ui/runtime/world/selection/job-card/CycleAbilityDisplay.tsx` | Cycle uses live state capsule. |
| `src/ui/runtime/world/selection/job-card/NextCycleEffectsDisplay.tsx` | Next-cycle groups render through generic effect sections. |

### Do not delete in this phase if still referenced outside lens content

| File | Reason |
| --- | --- |
| `src/ui/runtime/world/selection/ability-display/AbilityBarDisplay.tsx` | Still used by `StorageAbilityDisplay`, which is used by absorption card content unless migrated separately. |
| `src/ui/runtime/world/selection/ability-display/StorageAbilityDisplay.tsx` | Still used by absorption card sections unless migrated separately. |
| `src/ui/runtime/world/selection/ability-display/AbilityEffectList.tsx` | Delete only if no non-test references remain after job migration. |
| `src/ui/runtime/world/selection/absorption/AssignmentRequirementsSection.tsx` | Still used by absorption idle section. Assignment lens view must stop using it directly, but absorption may keep it. |
| `src/ui/runtime/world/selection/body/BodyStatusDisplay.tsx` | Still used by absorption body brick. |
| `src/ui/runtime/world/selection/body/BodyStatusIcons.ts` | Still used by absorption body brick data. |

### Test file deletion/update

- Delete tests for deleted components after their behavior is covered by card-display and lens-card tests.
- Update existing lens card tests instead of leaving tests for obsolete markup.
- Preserve behavior assertions, not component names.

---

## 8. Detailed lens layouts

### 8.1 Body card layout

Order:

1. Title: body avatar + display name.
2. Conditional activation notice.
3. Capabilities section:
   - Body: effective value and base-derived modifier.
   - Mind: effective value and base-derived modifier.
   - Social: effective value and base-derived modifier.
4. Live section:
   - Level.
   - XP current/max and XP rate.
   - Health current/max and anchored health effects.
5. Habiti section.
6. Other Effects section.
7. Description.

Attribute display rule:

```pseudocode
value = body.attributes[attr]
modifier = body.attributes[attr] - body.baseAttributes[attr]
render = icon + value + parenthesized modifier when modifier is nonzero
```

XP display rule:

```pseudocode
value = live binding for body.xp / computed XP max
rate = +body.xpRate/s when xpRate is nonzero
```

Health display rule:

```pseudocode
value = live binding for body.health / body.maxHealth
effects = anchored health trait effects and modifiers
```

Residual effects rule:

```pseudocode
residual = all modifiers and trait effects not consumed by attribute, XP, or health capsules
```

### 8.2 Cave card layout

Order:

1. Title: cave label.
2. Description: existing cave narration may stay below title or move to bottom; this implementation places it at bottom for consistency unless tests require current placement.
3. Conditional activation notice.
4. Live section: level, XP, population, comfort.
5. Sustainment section: food and heat current/max with rates and microbars.
6. Capabilities section: per-body Body/Mind/Social bonuses.
7. Habiti section.
8. Understanding section.
9. Other Effects section.
10. Description if not rendered near title.

Per-body bonus rule:

```pseudocode
base = resolved effective cave attribute
comfort = live comfort value
effective = floor(base * comfort)
render = icon + effective + parenthesized base
```

### 8.3 Power job card layout

Order:

1. Title: job icon/name if icon available, otherwise job label.
2. Suspicious activity badge/capsule when present.
3. Conditional activation notice.
4. Power Usage section: nonzero body/mind/social demand capsules.
5. Cycle section: cycle progress and countdown.
6. Next Cycle sections: effect capsules grouped by existing group title.
7. Storage section.
8. Other Effects / Traits section.
9. Description.

Power usage rule:

```pseudocode
demand = sink.baseDemand[attr]
current = demand * liveEfficiency
render = icon + current/demand + optional microbar
```

### 8.4 Assignment job card layout

Order:

1. Title.
2. Suspicious activity badge/capsule when present.
3. Conditional activation notice.
4. Requirements section.
5. Storage section.
6. Description.
7. Existing action controls and body selector modal outside the generic display model.

Requirement rule:

```pseudocode
filter label = tag capsule
minimum row = value capsule current/required
```

### 8.5 Resource card layout

Order:

1. Title.
2. Conditional activation notice.
3. Storage section.
4. Description.
5. Empty text if no storage.

Storage rule:

```pseudocode
existing AbilityBarModel -> ValueCapsuleModel
value binding and progress binding are preserved
```

### 8.6 Transfer card layout

Order:

1. Title: existing summary.
2. Transfer section:
   - Type.
   - Value.
   - From.
   - To.

### 8.7 Display card layout

Order:

1. Title: display label.
2. Conditional activation notice.
3. Description if present.
4. Subtitle capsule if description is absent.

---

## 9. Rendering optimization design

### 9.1 Static model versus live bindings

Every resolver must distinguish:

- Static semantic display structure.
- Live values that can update through entity-state-link.

Static model examples:

- Title text.
- Section order.
- Capsule IDs.
- Capsule skins.
- Tooltip lines that do not contain current values.
- Binding paths.

Live binding examples:

- Body XP current/max.
- Body health current/max.
- Resource storage current/max.
- Cave food/heat current/max.
- Cave comfort percentage.
- Job cycle current/max.

### 9.2 Parent-card render rule

Parent card hooks must use this rule:

```pseudocode
If common updates are handled by entity-state-link refs:
    use useImperativeRuntimeDerivedValue
    compare with selectionCardModelEqual
Else:
    use existing useRuntimeSelector only if rerendering the card is acceptable
```

For this LLD, all lens cards that display live current values must prefer `useImperativeRuntimeDerivedValue`.

### 9.3 Capsule render rule

```pseudocode
ValueCapsule shell renders through React.
LiveValueText text content updates through entity-state-link.
CapsuleMicrobar fill transform updates through entity-state-link.
Hover state updates through CSS only.
```

### 9.4 Equality rule

```pseudocode
Model equality compares structure and binding metadata.
Model equality does not compare runtime values behind live bindings.
```

### 9.5 Failure behavior

- Missing entity ID in a live binding renders fallback text and logs loudly only if the resolver was expected to have an entity ID.
- Missing optional tooltip renders no tooltip.
- Unknown icon ID relies on existing `GameIcon` fallback behavior.
- Invalid numeric values format as deterministic fallback text.
- Unknown effect targets become residual effect capsules; they are not dropped.

---

## 10. Testing plan

### 10.1 Unit tests

Add tests:

- `cardDisplayFormatters.test.ts`
- `cardDisplayEquality.test.ts`
- `resolveAnchoredEffects.test.ts`
- `adaptAbilityBarsToCapsules.test.ts`
- `entityStateLinkTextRuntime.numeric.test.ts`

Required cases:

- Happy path.
- Negative path.
- Empty/null/undefined inputs.
- Multiple effects targeting the same value.
- Unknown effect target.
- Live binding equality.
- Static value inequality.

### 10.2 View tests

Add tests:

- `ValueCapsule.test.tsx`
- `ValueCapsule.live.test.tsx`
- `ValueRail.test.tsx`
- `CapsuleList.test.tsx`
- `CardTitleBlock.test.tsx`
- `CardDescriptionBlock.test.tsx`
- `Section.test.tsx`
- `CardModelView.test.tsx`

Required cases:

- Renders visible data.
- Renders tooltip content through mocked `SmartTooltip`.
- Renders `ⓘ` only when clickable.
- Click calls action handler.
- Multiple effects are visible.
- Live text updates without parent rerender.
- Microbar updates without parent rerender.

### 10.3 Lens card tests

Update existing tests:

- `BodyCard.test.tsx`
- `CaveCard.test.tsx`
- `JobCard.test.tsx`
- `AssignmentJobCardView.test.tsx`
- `ResourceCard.test.tsx`
- `ResourceCard.live.test.tsx`
- `TransferCard.test.tsx`
- `DisplayCard` tests if present
- `selectionLensMap.*.test.ts`

Body assertions:

- Name visible.
- Permanent badge preserved.
- Attribute values visible as effective value plus modifier when modifier is nonzero.
- XP fraction visible.
- XP rate visible.
- Health fraction visible.
- Anchored health effect visible next to or inside health capsule.
- Residual effect visible only in residual section.
- Non-body selection renders null.

Cave assertions:

- Cave title visible.
- XP/level/population visible.
- Food and heat visible as capsules.
- Food/heat live text updates without rerender.
- Habiti and Understanding visible.

Job assertions:

- Assignment requirements visible.
- Assignment buttons still trigger existing callbacks.
- Power usage visible.
- Cycle visible.
- Storage visible.
- Suspicious activity visible when model exists.

Resource assertions:

- Storage visible.
- Empty storage text visible when no bars.
- Existing no-rerender live storage test remains valid.

Transfer assertions:

- Summary, type, value, source, and target remain visible.

Display assertions:

- Label, description, or subtitle remains visible.

### 10.4 Deletion tests

After deleting obsolete components:

- Remove obsolete component tests.
- Do not leave skipped tests.
- Do not leave tests asserting old component names or old DOM structure.

### 10.5 Performance tests

At minimum:

1. Resource storage text updates without rerendering card body.
2. Body XP text updates without rerendering body card shell.
3. Body health text updates without rerendering body card shell.
4. Cave food/heat text updates without rerendering cave card shell.

Test method:

```pseudocode
Given runtime test double and rendered card inside EntityStateLinkProvider
And render counter on the card shell/view
When entity state value mutates and runtime invalidation emits changedEntityIds
And entity-state-link sync interval advances
Then visible text changes
And render counter remains unchanged
```

---

## 11. Implementation sequence

### Phase 1: Shared card-display foundation

1. Add card-display types.
2. Add formatters and equality.
3. Add anchored-effect resolver.
4. Add ability-bar adapter.
5. Add atoms.
6. Add molecules.
7. Add organisms.
8. Add tests for all new logic and view components.

Exit criteria:

- New card-display tests pass.
- No existing lens card behavior has changed.

### Phase 2: Entity-state-link numeric text support

1. Extend `EntityTextBinding` with numeric text binding.
2. Extend text runtime resolution/equality.
3. Add tests.

Exit criteria:

- Existing entity-state-link tests pass.
- New numeric binding tests pass.
- Existing ResourceCard live test still passes.

### Phase 3: Resource and Display cards

1. Migrate ResourceCard to `CardModelView`.
2. Migrate DisplayCard to `CardModelView`.
3. Update tests.

Reason for this order: Resource already has live optimized storage behavior and validates the new adapter against an existing no-rerender contract. Display is simple static content.

### Phase 4: Transfer card

1. Migrate TransferCard to `CardModelView`.
2. Update tests.

### Phase 5: Body card

1. Add body selectors for `xpRate` and `baseAttributes`.
2. Migrate resolver to build model.
3. Migrate hook to optimized derived value.
4. Migrate view to `CardModelView`.
5. Update tests.
6. Add body live no-rerender tests.

### Phase 6: Cave card

1. Migrate resolver to build model.
2. Convert food/heat/comfort to live bindings.
3. Migrate view to `CardModelView`.
4. Update tests.
5. Add cave live no-rerender tests.

### Phase 7: Job cards

1. Migrate power job model.
2. Migrate assignment job model.
3. Preserve action controls outside generic model.
4. Migrate views.
5. Update tests.
6. Add storage/cycle live no-rerender tests as needed.

### Phase 8: Detritus removal

1. Run reference search for obsolete components.
2. Delete files with no non-test references.
3. Delete or update obsolete tests.
4. Run full test suite.
5. Run lint and Sonar checks.

---

## 12. Acceptance criteria

The implementation is complete only when all of the following are true:

1. Every selection lens card listed in section 1 renders its content through the new card-display system.
2. No lens card content directly imports obsolete bespoke display components listed for deletion.
3. Values and local modifiers are spatially bound in the same capsule.
4. Body attributes render as `[icon] value (modifier)`.
5. Body XP renders as current/max plus rate.
6. Body health renders as current/max plus health effects/rates when present.
7. Habiti and Understanding render through `CapsuleList` / `TagBlock`.
8. Residual effects render through `EffectsBlock` and do not duplicate anchored effects.
9. Clickable display items show `ⓘ` and hover treatment.
10. Tooltip-only display items do not show `ⓘ`.
11. Routine live value updates do not rerender card shells when live bindings can update text/bar directly.
12. Existing assignment buttons and modal behavior remain intact.
13. Existing lens selection matching is unchanged.
14. No direct ECS mutation is introduced.
15. No new business logic is placed in `.tsx` render components.
16. All tests pass.
17. No lint or Sonar issues remain.
18. Deleted detritus files have no remaining imports.
19. No TODOs are introduced.
20. No out-of-scope refactors are included.

---

## 13. Explicit non-ambiguity decisions

1. `ValueCapsule` is a molecule, not an organism.
2. Organisms are card regions and full-card renderers.
3. Capsule skins are visual tokens, not domain types.
4. Tooltip does not imply clickability.
5. Clickability always implies `ⓘ`.
6. Section click action belongs to the section title, not the whole section body.
7. Parent cards use model equality and live bindings to avoid rerenders.
8. Live current values use entity-state-link refs rather than React state when possible.
9. Effects that can be locally anchored must be locally anchored.
10. Effects that cannot be locally anchored must appear in `EffectsBlock`.
11. No effect may be silently dropped.
12. Existing storage discovery remains in `resolveStorageAbilityBars` and is adapted, not reimplemented.
13. Existing Absorption card display components are not deleted unless they have no remaining references.
14. Codex click support is modeled but not implemented here.
15. The lens map matching order is unchanged.

