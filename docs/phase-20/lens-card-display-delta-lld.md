# LLD Delta: Complete Selection Lens Card Display Migration

## 1. Status

**Document type:** Low-level design delta.

**Purpose:** Define the exact implementation delta required to complete the selection lens card display migration after the partial implementation currently present.

**Parent design:** `lens-card-display-lld.md` remains in force. This delta does not replace the parent design. It specifies the remaining work needed to make the implementation conform to that design.

**Canonical constraints in force:**

- UI observes runtime state and never mutates ECS state directly.
- React presentation files do not contain business logic.
- Frequently changing runtime values must not rerender whole cards when existing entity-state-link mechanisms can update text or bar DOM nodes directly.
- Styling uses Emotion and existing theme tokens.
- Tests are behavior-oriented, readable, isolated, and colocated.
- No speculative refactors or unrelated cleanup are in scope.

## 2. Scope

### 2.1 In scope

This delta covers only the selection lens card display migration for these lens cards:

- `src/ui/runtime/world/selection/body/BodyCard.tsx`
- `src/ui/runtime/world/selection/cave/CaveCard.tsx`
- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- `src/ui/runtime/world/selection/ResourceCard.tsx`
- `src/ui/runtime/world/selection/TransferCard.tsx`
- `src/ui/runtime/world/selection/DisplayCard.tsx`

This delta also covers the shared display system used by those cards:

- `src/ui/runtime/world/selection/card-display/**`
- `src/ui/runtime/world/entity-state-link/**` only where required for generic live text support
- selection-card tests directly validating the migration

### 2.2 Out of scope

The following are explicitly out of scope:

- ECS simulation changes.
- Blueprint schema changes.
- Codex feature implementation.
- Game balance changes.
- New card types outside the current selection lens map.
- Absorption body-selector behavior, except removing display-only dependencies that are pulled into lens cards.
- General visual redesign beyond completing the card-display grammar.

### 2.3 Completion definition

The delta is complete only when all of the following are true:

1. Every in-scope lens card renders its display content through `CardModelView` and the `card-display` model grammar.
2. No old display-only card-content systems remain imported by in-scope lens card views.
3. Fast-changing current values update through `EntityStateLinkProvider` text/bar bindings where a binding is available.
4. Parent card shells do not rerender for routine XP, health, storage, comfort, or cycle countdown updates.
5. Attribute capsules display as `[icon] value (modifier)` when the modifier is nonzero.
6. XP capsules display `current/max` and the XP rate as an adjacent rate segment.
7. Health capsules display `current/max` and anchored health rate/effect segments.
8. Clickable title, description, section-title, and capsule surfaces all show the `ⓘ` affordance and the shared hover treatment.
9. Tooltip-only elements do not show the `ⓘ` affordance.
10. The description block renders after sections unless an individual resolver explicitly models description as an ordinary section.
11. Duplicate display systems listed in this document are deleted after import search proves they are unused.
12. Tests described in this document are present and pass.
13. Lint, typecheck, and existing test suites pass.

## 3. Why

### 3.1 The current implementation is a scaffold, not a completed migration

The current implementation adds a `card-display` system and partially routes cards through it. That is useful scaffolding, but it does not complete the contract.

Observed gaps :

- Body and cave cards still use React selector hooks that compare fast-changing live values.
- Body XP and health text are static strings in the model rather than live text bindings.
- Cave XP, population, comfort, food, and heat text are static strings in the model rather than live text bindings.
- Job cards still render old display systems such as power matrix, cycle display, next-cycle effects, and assignment requirements.
- Title, description, and section models expose tooltip/action fields, but their renderers do not consistently implement the tooltip/action contract.
- Description renders before sections in `CardModelView`, which contradicts the intended readability hierarchy.
- The capsule skin resolver returns inconsistent shapes for warning/danger/success skins.
- Old display-only components and tests remain present, and some remain imported by live card views.

### 3.2 The rendering problem remains unsolved

The parent design required optimized rendering: only the visible fragment that changes should update. The current implementation does not achieve this for body/cave cards because the data hooks still put changing values into the React card model.

The correct model is:

- Static structure changes rerender the card model.
- Live current values update through entity-state-link text/bar refs.
- If a rate, modifier, section, tooltip, ownership state, or title changes, the relevant model changes and rerenders are allowed.
- If only XP current value, health current value, storage amount, comfort, or countdown text changes, the card shell and static capsule shells do not rerender.

### 3.3 The display grammar must be unambiguous

The agreed grammar is:

- Attribute value: `[icon] value (modifier)`
- Live stat value: `[icon] current/max rate`
- Residual effect: `[icon] modifier`
- Habitus/tag: `[label]` or `[label summary]`

The current implementation anchors some effects, but attributes render adjacent effects without the required parentheses and without guaranteed base/effective arithmetic. That leaves the player to infer semantics and leaves duplicate effect rows possible.

### 3.4 Duplicate systems are technical debt

A shared display system only reduces complexity after the old display-only systems are removed. Keeping both systems increases maintenance cost and makes future card changes ambiguous. This delta requires explicit deletion after references are removed.

## 4. What

## 4.1 Target architecture after the delta

The final in-scope architecture is:

```pseudocode
Lens card component
  uses a derived model hook
  passes SelectionCardModel to CardModelView

CardModelView
  renders SelectionCardShell
  renders CardTitleBlock
  renders badges
  renders ConditionalActivationNotice when modeled
  renders sections in order
  renders CardDescriptionBlock last

Section
  renders optional section title surface
  renders capsules through ValueRail or customSlots

ValueCapsule
  renders icon/title/value/effects/suffix/progress
  uses LiveValueText for live text bindings
  uses CapsuleMicrobar for live bar bindings
  uses InteractiveFrame for click affordance
```

## 4.2 Data-flow requirement

For every in-scope card, data must be split into:

1. **Static or structural card model data**: title, section list, capsule list, icon IDs, labels, static modifiers, action descriptors, tooltip models, live binding identities, and live binding paths.
2. **Live current values**: runtime values handled by entity-state-link text/bar bindings.

The card model may include static fallback text only when that text does not represent a frequently changing value.

## 4.3 Remaining allowed custom content

Only interactive controls that are not display content may remain as custom slots.

Allowed custom slots:

- Assignment action buttons.
- Body assignment modal launcher content.
- Explicitly interactive UI that cannot be represented as capsules because it performs a command or opens a modal.

Disallowed custom slots:

- Power matrix display.
- Cycle status display.
- Next-cycle effect display.
- Assignment requirements display.
- Storage displays.
- Attribute displays.
- Modifier displays.
- Trait displays.
- Habiti displays.
- Cave vitals/sustainment/capabilities displays.

## 4.4 Residual effects rule

A modifier/effect must be shown in exactly one place.

```pseudocode
if an effect has a local target capsule:
    render it as an effect segment inside that capsule
else:
    render it as one residual modifier capsule in the Effects section
```

Required local targets:

- Body card: `body`, `mind`, `social`, `xp`, `health`
- Cave card: `xp`, `level`, `population`, `comfort`, `food`, `heat`, `body`, `mind`, `social`
- Job card: demand attributes, cycle, output/storage values where the job model exposes matching bindings
- Resource card: storage amount
- Transfer card: transferred amount or source/target values where present

Effects must never be duplicated between a local capsule and the residual Effects section.

## 5. How: implementation phases

The implementation must follow the phases below in order. Do not delete detritus before replacement imports are removed and tests pass for the replacement behavior.

### Phase 1: Repair shared display primitives

Goal: make the shared `card-display` components match the parent design contract before migrating more cards.

Files changed in this phase:

- `src/ui/runtime/world/selection/card-display/cardDisplayTypes.ts`
- `src/ui/runtime/world/selection/card-display/atoms/CapsuleFrame.tsx`
- `src/ui/runtime/world/selection/card-display/atoms/InteractiveFrame.tsx`
- `src/ui/runtime/world/selection/card-display/molecules/CardTitleBlock.tsx`
- `src/ui/runtime/world/selection/card-display/molecules/CardDescriptionBlock.tsx`
- `src/ui/runtime/world/selection/card-display/molecules/Section.tsx`
- `src/ui/runtime/world/selection/card-display/organisms/CardModelView.tsx`
- related tests listed in section 9

### Phase 2: Add generic live numeric text binding

Goal: allow `CardModelView` capsules to display live single numeric values without rerendering the card.

Files changed in this phase:

- `src/ui/runtime/world/entity-state-link/types.ts`
- `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`
- `src/ui/runtime/world/entity-state-link/useEntityTextRef.ts`
- related tests listed in section 9

### Phase 3: Complete body card migration

Goal: body card uses the card-display model fully, with live XP/health text and correct attribute modifiers.

Files changed in this phase:

- `src/ui/runtime/world/selection/body/bodyCardSelectors.ts`
- `src/ui/runtime/world/selection/body/bodyCardTypes.ts`
- `src/ui/runtime/world/selection/body/resolveBodyCardData.ts`
- `src/ui/runtime/world/selection/body/bodyCardHydration.ts`
- `src/ui/runtime/world/selection/body/useBodyCardData.ts`
- `src/ui/runtime/world/selection/body/BodyCard.tsx`
- `src/ui/runtime/world/selection/body/BodyCardView.tsx`
- `src/ui/runtime/world/selection/card-display/resolveBodyCardModel.ts`
- related tests listed in section 9

### Phase 4: Complete cave card migration

Goal: cave card uses the card-display model fully, with live text/bar bindings for dynamic cave values and no old cave display sections.

Files changed in this phase:

- `src/ui/runtime/world/selection/cave/caveCardTypes.ts`
- `src/ui/runtime/world/selection/cave/resolveCaveCardData.ts`
- `src/ui/runtime/world/selection/cave/caveCardHydration.ts`
- `src/ui/runtime/world/selection/cave/CaveCard.tsx`
- `src/ui/runtime/world/selection/cave/CaveCardView.tsx`
- `src/ui/runtime/world/selection/card-display/resolveCaveCardModel.ts`
- related tests listed in section 9

### Phase 5: Complete job card migration

Goal: job display content is represented by generic sections/capsules. Only assignment action controls remain outside the display grammar.

Files changed in this phase:

- `src/ui/runtime/world/selection/job-card/jobCardTypes.ts`
- `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`
- `src/ui/runtime/world/selection/job-card/jobCardHydration.ts`
- `src/ui/runtime/world/selection/job-card/jobCardHydrationEquality.ts`
- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- `src/ui/runtime/world/selection/job-card/JobCardView.tsx`
- `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`
- `src/ui/runtime/world/selection/job-card/AssignmentJobCardView.tsx`
- `src/ui/runtime/world/selection/card-display/resolvePowerJobCardModel.ts`
- `src/ui/runtime/world/selection/card-display/resolveAssignmentJobCardModel.ts`
- related tests listed in section 9

### Phase 6: Verify resource, transfer, and display cards

Goal: these simpler cards conform to the same action, tooltip, description, and live binding contracts.

Files changed in this phase:

- `src/ui/runtime/world/selection/ResourceCard.tsx`
- `src/ui/runtime/world/selection/ResourceCardView.tsx`
- `src/ui/runtime/world/selection/resolveResourceCardData.ts`
- `src/ui/runtime/world/selection/resourceCardHydration.ts`
- `src/ui/runtime/world/selection/TransferCard.tsx`
- `src/ui/runtime/world/selection/TransferCardView.tsx`
- `src/ui/runtime/world/selection/resolveTransferCardData.ts`
- `src/ui/runtime/world/selection/transferCardHydration.ts`
- `src/ui/runtime/world/selection/DisplayCard.tsx`
- `src/ui/runtime/world/selection/DisplayCardView.tsx`
- `src/ui/runtime/world/selection/resolveDisplayCardData.ts`
- `src/ui/runtime/world/selection/displayCardHydration.ts`
- `src/ui/runtime/world/selection/card-display/resolveResourceCardModel.ts`
- `src/ui/runtime/world/selection/card-display/resolveTransferCardModel.ts`
- `src/ui/runtime/world/selection/card-display/resolveDisplayCardModel.ts`
- related tests listed in section 9

### Phase 7: Clear detritus

Goal: delete old display-only files after references are removed.

Files deleted in this phase are listed in section 8.

### Phase 8: Final verification

Goal: prove the migration is complete.

Required commands:

```pseudocode
run typecheck
run lint
run full test suite
run targeted render-optimization tests
run import-search checks for deleted systems
```

The exact package commands must be taken from the repository package metadata in the implementation environment. Do not invent command names.

## 6. File-level design: shared display system

## 6.1 `src/ui/runtime/world/selection/card-display/cardDisplayTypes.ts`

**Status:** Change existing file.

**Responsibility:** Define the complete card-display model contract.

**Required logic:** None. This file contains types only.

**Required interface delta:**

- Keep existing model type names.
- Add explicit support for custom slots without storing React nodes in the model:
    - `customContentKind` remains the stable slot key.
    - `customContent` must be removed from `CardSectionModel` or kept only as a temporary deprecated field during the migration phase.
    - Final state must use a `customSlots` map supplied to `CardModelView`, not React nodes embedded in `SelectionCardModel`.
- Ensure `CardDescriptionModel` includes:
    - stable `id`
    - `text`
    - optional `variant`, defaulting in renderer to narration
    - optional `tooltip`
    - optional `action`
    - optional `maxLines`
- Ensure `CardSectionModel` includes:
    - stable `id`
    - optional `title`
    - optional `titleIconId`
    - optional `tooltip`
    - optional `action`
    - required `layout`
    - required `density`
    - optional `capsules`
    - optional `customContentKind`
- Ensure `ValueCapsuleModel` supports live text through `CapsuleValueModel.binding` and progress through `CapsuleProgressModel`.
- Ensure `CardDisplayAction` is a pure action descriptor or callback supplied by the view layer. The model resolver must not create ECS mutations.

**Final-state interface rule:** A `SelectionCardModel` must not contain arbitrary React nodes. All custom UI content is passed separately to `CardModelView` by slot key.

**Tests:** Type-only file has no direct tests. Behavior is covered by model renderer tests.

## 6.2 `src/ui/runtime/world/selection/card-display/cardDisplayFormatters.ts`

**Status:** Change existing file if needed.

**Responsibility:** Centralize formatting for card-display values and effect text.

**Required logic:**

- Format attribute modifier segments as parenthesized signed modifiers.
- Return no visible attribute modifier segment for zero.
- Format compact fractions using existing compact fraction utilities where possible.
- Format static rates as signed value per interval.
- Resolve effect tone from a known sign, not from string parsing when a numeric sign is available.

**Required interface:**

- A formatter for attribute modifiers.
- A formatter for compact fractions.
- A formatter for signed rate text.
- A formatter or resolver for effect tone.

**Tests:**

- Positive attribute modifier becomes parenthesized plus text.
- Negative attribute modifier becomes parenthesized minus text.
- Zero attribute modifier produces no segment.
- Positive rate omits parentheses.
- Negative rate omits parentheses.
- Interval text is preserved exactly.

## 6.3 `src/ui/runtime/world/selection/card-display/cardDisplayEquality.ts`

**Status:** Change existing file.

**Responsibility:** Compare display models without using lossy serialization.

**Current issue:** Existing equality uses broad serialized comparisons for some nested fields. Serialization drops functions and can hide action changes.

**Required logic:**

- Compare models field-by-field.
- Compare action descriptors explicitly:
    - `id`
    - `label`
    - `kind`
    - `entryId`
    - `disabled`
    - callback reference when callback actions are present
- Compare tooltip models by title, lines, placement, and content identity where content is a React node escape hatch.
- Compare live text bindings by binding type, entity ID, path fields, formatter fields, and static max values.
- Compare progress bindings by ID, entity ID, value path, max path, max value, and color.
- Do not compare actual current runtime values that are intentionally handled by entity-state-link.

**Required interface:**

- `selectionCardModelEqual(left, right)`
- `cardSectionModelsEqual(left, right)`
- `valueCapsuleModelsEqual(left, right)`
- optional smaller comparers as needed to keep file size under project limits

**Tests:**

- Identical models compare equal.
- Changed title text compares unequal.
- Changed action disabled state compares unequal.
- Changed action callback reference compares unequal for callback actions.
- Changed live binding path compares unequal.
- Changed progress path compares unequal.
- Runtime value changes are not represented in the model and therefore do not affect equality.

## 6.4 `src/ui/runtime/world/selection/card-display/atoms/CapsuleFrame.tsx`

**Status:** Change existing file.

**Responsibility:** Apply visual skin to a capsule.

**Current issue:** The skin resolver returns objects for some skins and raw color strings for warning/danger/success. The styled component expects object fields for every skin.

**Required logic:**

- Resolve every `CapsuleSkin` to one palette object with the same shape.
- The palette object must include border color, background color, and text color.
- Use theme tokens only.
- Do not contain semantic domain logic.

**Required interface:**

- Props remain `skin`, optional `emphasis` if implemented, optional `className`, and `children`.
- The component must render valid CSS for every skin in the enum.

**Tests:**

- Smoke render for every skin.
- Warning, danger, and success skins render without undefined CSS values.
- Plain/value skins render no pill padding or visible border.

## 6.5 `src/ui/runtime/world/selection/card-display/atoms/InteractiveFrame.tsx`

**Status:** Change existing file.

**Responsibility:** Provide the shared click and hover affordance.

**Current issues:**

- Only `callback` actions with a direct callback are interactive.
- `codex` actions silently render passive when no callback exists.
- Magic positioning values are hard-coded.
- The action contract is not exposed to title, description, or section title renderers.

**Required logic:**

- Render passive content when there is no action.
- Render clickable content when an action is present and not disabled.
- Render disabled interactive content when an action is present and disabled.
- Always show the `ⓘ` affordance when an action exists, including disabled actions.
- Use a supplied `onAction` dispatcher when the action has no direct callback.
- If neither `action.callback` nor `onAction` can handle the action, render the affordance and do not throw; clicking must do nothing and must not silently mutate state.
- Use CSS hover treatment only. Do not store hover state in React.
- Use theme spacing tokens for marker position.

**Required interface:**

- Props:
    - optional `action`
    - optional `onAction`
    - optional `className`
    - required `children`

**Action dispatch rule:**

```pseudocode
when clicked:
    if action is disabled:
        do nothing
    else if action has callback:
        call callback
    else if onAction exists:
        call onAction(action)
    else:
        do nothing
```

**Tests:**

- No action renders no `ⓘ`.
- Callback action renders `ⓘ` and calls callback once.
- Codex action without callback renders `ⓘ` and calls `onAction` once.
- Disabled action renders `ⓘ` and calls neither callback nor dispatcher.
- Hover styling is class/style driven and requires no React state assertion.

## 6.6 `src/ui/runtime/world/selection/card-display/molecules/CardTitleBlock.tsx`

**Status:** Change existing file.

**Responsibility:** Render the card title model.

**Current issues:**

- It imports `BodyAvatar` directly from the body feature.
- It uses `SelectionTitleRow`, which can resolve runtime data in render.
- It ignores `title.action`.
- It requires runtime/entity props that should not be needed by a generic title molecule.

**Required logic:**

- Render supplied avatar model without resolving runtime data in this molecule.
- Render supplied icon ID through existing `GameIcon` when no avatar is supplied.
- Render title text.
- Apply tooltip when provided.
- Apply `InteractiveFrame` when action is provided.
- Prefer avatar over icon when both are supplied.

**Required interface:**

- Props:
    - required `model` or `title`
    - optional `onAction`
- Do not require `runtime`, `entity`, or `entityId` props.

**Dependency rule:** The generic `card-display` title molecule must not import from `src/ui/runtime/world/selection/body/**`. If body avatar rendering requires feature-specific code, move the avatar display atom to a shared non-body location or pass a rendered avatar slot through a clearly typed avatar component boundary. The final title molecule must not depend on body-card files.

**Tests:**

- Renders text-only title.
- Renders icon title.
- Renders avatar title.
- When both avatar and icon are supplied, avatar renders and icon does not render.
- Tooltip renders when supplied.
- Action renders `ⓘ` and dispatches through callback/dispatcher.

## 6.7 `src/ui/runtime/world/selection/card-display/molecules/CardDescriptionBlock.tsx`

**Status:** Change existing file.

**Responsibility:** Render description text using the shared display contract.

**Current issue:** It renders only narration RichText and ignores tooltip/action.

**Required logic:**

- Render rich text using existing `RichText`.
- Default to narration styling unless `variant` is supplied.
- Apply optional line clamp if `maxLines` is supplied.
- Apply tooltip when provided.
- Apply `InteractiveFrame` when action is provided.

**Required interface:**

- Props:
    - required `model` or `description`
    - optional `onAction`

**Tests:**

- Renders description text.
- Uses narration styling by default.
- Tooltip renders when supplied.
- Action renders `ⓘ` and dispatches.

## 6.8 `src/ui/runtime/world/selection/card-display/molecules/Section.tsx`

**Status:** Change existing file.

**Responsibility:** Render one section title and section body.

**Current issues:**

- It ignores section tooltip/action.
- It renders `customContent` directly from the model.
- It does not support slot-based custom content.

**Required logic:**

- Render nothing only when there is no title, no capsules, and no custom slot content.
- Render section title with tooltip/action behavior.
- Render capsules through `ValueRail`.
- Render custom slot content by looking up `customContentKind` in `customSlots` supplied by `CardModelView`.
- Do not make the whole section body clickable for a section action.

**Required interface:**

- Props:
    - required `section`
    - optional `customSlots`
    - optional `onAction`

**Tests:**

- Renders a titled capsule section.
- Renders an untitled capsule section.
- Renders known custom slot content.
- Unknown custom slot key renders no content and logs loudly if project logging conventions support display-layer diagnostics.
- Section action applies only to the section title surface.

## 6.9 `src/ui/runtime/world/selection/card-display/molecules/ValueCapsule.tsx`

**Status:** Change existing file if required.

**Responsibility:** Render one value capsule.

**Required logic:**

- Render all effect segments in order.
- Render parenthesized attribute segments exactly as provided by resolver.
- Render live text through `LiveValueText` when `value.binding` exists.
- Render static text when `value.text` exists.
- Render progress through `CapsuleMicrobar` when `progress` exists.
- Apply tooltip/action contracts through shared wrappers.
- Do not contain domain-specific formatting logic.

**Required interface:**

- Props:
    - required `model`
    - optional `onAction`

**Tests:**

- Renders icon, title, static value, all effects, suffix, and progress when supplied.
- Renders live text placeholder registered through `LiveValueText` when binding is supplied.
- Does not drop multiple effects.
- Action behavior follows `InteractiveFrame` contract.

## 6.10 `src/ui/runtime/world/selection/card-display/organisms/CardModelView.tsx`

**Status:** Change existing file.

**Responsibility:** Render a complete `SelectionCardModel`.

**Current issue:** It renders description before sections.

**Required logic:**

- If model is null, render null.
- Render shell.
- Render title.
- Render title badges if modeled.
- Render conditional activation notice.
- Render sections in model order.
- Render description last.
- Render empty text only when there are no sections with visible content and no description.
- Pass `customSlots` and `onAction` to child renderers.

**Required interface:**

- Props:
    - required `model` or null
    - optional `runtime` for existing conditional notice only
    - optional `customSlots`
    - optional `onAction`

**Tests:**

- Null model renders null.
- Full model renders title, sections, then description in that order.
- Conditional notice receives modeled entity ID.
- Custom slots render in the matching section.
- `onAction` reaches title, description, section title, and capsules.

## 7. File-level design: entity-state-link live text

## 7.1 `src/ui/runtime/world/entity-state-link/types.ts`

**Status:** Change existing file.

**Responsibility:** Define live text binding types.

**Required interface delta:**

Add a new `EntityTextBinding` variant named `numeric-text`.

Fields for `numeric-text`:

- `id`: stable binding ID.
- `entityId`: runtime entity ID.
- `kind`: `numeric-text`.
- `valuePath`: path resolved against the entity.
- `format`: one of:
    - `compact-number`
    - `integer-percent`
    - `raw-number`
- `multiplier`: optional numeric multiplier applied before formatting. Required for percent display when the stored value is a 0..1 ratio and display is 0..100 percent.
- `suffix`: optional static suffix appended after formatting.
- `fallbackText`: optional text used when the value cannot be resolved.

No function formatter may be stored in the binding. Bindings must remain serializable data structures except for existing runtime object references outside this type.

**Tests:** Covered by runtime text tests.

## 7.2 `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.ts`

**Status:** Change existing file.

**Responsibility:** Resolve and sync live text bindings.

**Required logic:**

- Resolve `numeric-text` by reading `valuePath`, applying optional `multiplier`, formatting by `format`, and appending optional `suffix`.
- Preserve existing behavior for `compact-fraction`, `remaining-duration-ms`, and `cycle-countdown`.
- If a path cannot be resolved, use `fallbackText` if supplied; otherwise use an empty string.
- Include `numeric-text` fields in binding equality.
- Include `numeric-text` fields in internal resolver creation.

**Formatting contract:**

```pseudocode
compact-number:
    use existing compact number formatter or nearest existing status/display utility
integer-percent:
    round numeric value to nearest integer and append percent suffix unless suffix overrides it
raw-number:
    stringify the numeric value without compact abbreviation
```

**Tests:**

- Compact numeric binding updates text from entity state.
- Integer percent binding multiplies and rounds correctly.
- Raw numeric binding displays the raw resolved number.
- Missing path uses fallback text.
- Missing path without fallback displays empty text.
- Equality detects changed path, formatter, multiplier, suffix, and fallback.
- Text updates after runtime mutation without parent React rerender.

## 7.3 `src/ui/runtime/world/entity-state-link/useEntityTextRef.ts`

**Status:** Change existing file.

**Responsibility:** Register live text bindings with the entity-state-link provider.

**Required logic:**

- Include new `numeric-text` fields in the effect dependency list.
- Preserve current registration/unregistration behavior.
- Do not read runtime state in render.

**Required interface:** No public hook name change.

**Tests:** Covered by `LiveValueText` and entity-state-link tests.

## 8. File-level design: body card delta

## 8.1 `src/ui/runtime/world/selection/body/bodyCardSelectors.ts`

**Status:** Change existing file.

**Responsibility:** Provide body-specific selector helpers used by body card data resolution.

**Required logic:**

- Keep existing selectors for level, XP, health, max health, attributes, display name, fallback icon, and Habiti.
- Add selector for body XP rate from `body.xpRate`, defaulting to the same default used by simulation when absent.
- Add selector for base attributes from `body.baseAttributes`.
- Selectors must not mutate data.

**Required interface:**

- Add `selectBodyXpRate(entity)`.
- Add `selectBodyBaseAttributes(entity)`.

**Tests:**

- XP rate selector returns stored rate.
- XP rate selector returns default when absent.
- Base attributes selector returns stored base attributes.

## 8.2 `src/ui/runtime/world/selection/body/bodyCardTypes.ts`

**Status:** Change existing file.

**Responsibility:** Define body card data used to build the display model.

**Required interface delta:**

- Add `baseAttributes`.
- Add `liveXpRate` or `xpRate`.
- Remove live current values from equality-sensitive model data if they are represented only by live bindings and no longer needed for static fallback.
- Keep values needed for initial static section decisions, tooltip content, and non-live derived display.

**Final-state rule:** If a field changes every tick and is rendered through entity-state-link, it must not be part of `bodyCardDataEqual`.

**Tests:** Covered through hydration/equality tests.

## 8.3 `src/ui/runtime/world/selection/body/resolveBodyCardData.ts`

**Status:** Change existing file.

**Responsibility:** Resolve body card domain data from runtime/entity.

**Required logic:**

- Resolve subject body entity exactly as current implementation does.
- Resolve display name, description, fallback icon, Habiti, modifiers, and traits as before.
- Resolve base attributes and effective attributes.
- Resolve XP rate.
- Avoid resolving fast-changing current XP/health values solely to render static text when live bindings will render those values.

**Required interface:** Returns updated `BodyCardData`.

**Tests:**

- Data includes base and effective attributes.
- Data includes XP rate.
- Data preserves Habiti, modifiers, and trait summaries.
- Missing subject returns null or existing null-equivalent behavior.

## 8.4 `src/ui/runtime/world/selection/body/bodyCardHydration.ts`

**Status:** Change existing file.

**Responsibility:** Define invalidation plan and equality for body card data.

**Required logic:**

- Remove comparisons for XP current value, health current value, and other fast-changing values that are rendered through live bindings.
- Compare structural fields only:
    - subject ID
    - display name
    - description
    - fallback icon
    - base attributes
    - effective attributes
    - XP rate
    - Habiti
    - modifier summaries
    - trait summaries
- Keep hydration plan broad enough to catch structural changes, trait changes, Habiti changes, assignment/title changes, and cave modifier changes.

**Required interface:** Existing exported functions remain unless renamed consistently.

**Tests:**

- Changing XP current value alone compares equal.
- Changing health current value alone compares equal.
- Changing max health path value is handled by live binding; if max health is not part of model fallback, it compares equal.
- Changing XP rate compares unequal.
- Changing effective attributes compares unequal.
- Changing base attributes compares unequal.
- Changing Habiti compares unequal.

## 8.5 `src/ui/runtime/world/selection/body/useBodyCardData.ts`

**Status:** Change existing file.

**Responsibility:** Subscribe body card to structural runtime changes.

**Required logic:**

- Replace `useRuntimeSelector` with `useImperativeRuntimeDerivedValue` unless a stronger existing granular mechanism already satisfies the same no-rerender contract.
- Use a hydration plan that observes required structural dependencies.
- Use `bodyCardDataEqual` to suppress rerenders when only live-bound current values changed.

**Required interface:** Hook name may remain `useBodyCardData`.

**Tests:** Covered through body render-optimization test.

## 8.6 `src/ui/runtime/world/selection/card-display/resolveBodyCardModel.ts`

**Status:** Change existing file.

**Responsibility:** Convert `BodyCardData` into `SelectionCardModel`.

**Required logic:**

- Build title with avatar and display name.
- Build attribute section before live-state section unless product direction changes the order.
- Attribute capsules must display effective value and parenthesized modifier when modifier is nonzero.
- Attribute modifier must be computed from `effective - base`, not scraped from generic anchored modifier text.
- XP capsule must display live `current/max` through `compact-fraction` binding using `body.xp` and XP max.
- XP capsule must display XP rate as a static rate effect segment from `xpRate`.
- Level capsule should use live numeric text only if level is expected to change without a structural model change. Otherwise it may remain static if equality treats level as structural.
- Health capsule must display live `current/max` through `compact-fraction` binding using `body.health` and `body.maxHealth`.
- Health capsule must include a progress microbar using `body.health` and `body.maxHealth`.
- Health effect segments must be anchored from trait/effect analysis when they target health.
- Residual Effects section must exclude effects already shown in attribute, XP, or health capsules.
- Habiti section must render through shared capsule adapters.
- Description must be supplied to `SelectionCardModel.description`; `CardModelView` renders it last.

**Required interface:** Existing `resolveBodyCardModel(data)` export may remain.

**Tests:**

- Attributes render as effective value plus parenthesized modifier.
- Zero attribute modifier is omitted.
- XP renders live fraction binding and rate effect.
- Health renders live fraction binding and microbar binding.
- Health effect anchors to health capsule.
- Anchored attribute effects do not duplicate in residual Effects section.
- Description appears after sections in rendered output.

## 8.7 `src/ui/runtime/world/selection/body/BodyCard.tsx`

**Status:** Change existing file only if needed by hook changes.

**Responsibility:** Adapt selection card props to body card view.

**Required logic:**

- Call the structural body data hook.
- Pass data and runtime to the view.
- No display logic.

**Tests:** Covered by body card view/integration tests.

## 8.8 `src/ui/runtime/world/selection/body/BodyCardView.tsx`

**Status:** Change existing file.

**Responsibility:** Render body card through the generic card model view.

**Required logic:**

- Resolve `SelectionCardModel` using `resolveBodyCardModel`.
- Render `CardModelView`.
- Do not import or render `BodyCardContent`.
- Do not import or render old body display-only components.

**Required interface:** Existing props may remain if they only carry data/runtime.

**Tests:**

- Smoke render.
- Visible body title, attributes, live row, Habiti, and description.
- Render count does not increase when only `body.xp` changes.
- Render count does not increase when only `body.health` changes.

## 9. File-level design: cave card delta

## 9.1 `src/ui/runtime/world/selection/cave/caveCardTypes.ts`

**Status:** Change existing file.

**Responsibility:** Define cave card data used to build the display model.

**Required interface delta:**

- Keep structural data for title, attributes, Habiti, Understanding, modifiers, and traits.
- Remove or isolate fast-changing live values from equality-sensitive data where equivalent live bindings can render them.
- Retain live max/static max values only where no live binding path exists.

**Tests:** Covered through hydration/equality tests.

## 9.2 `src/ui/runtime/world/selection/cave/resolveCaveCardData.ts`

**Status:** Change existing file.

**Responsibility:** Resolve structural cave display data.

**Required logic:**

- Preserve current cave label, Habiti, Understanding, modifier, and trait resolution.
- Do not resolve fast-changing values solely for static display if a binding can render them.
- Preserve structural values needed for section existence decisions and static tooltips.

**Tests:**

- Preserves Habiti and Understanding display entries.
- Preserves modifiers and traits.
- Resolves attributes needed for per-body bonus display.

## 9.3 `src/ui/runtime/world/selection/cave/caveCardHydration.ts`

**Status:** Change existing file.

**Responsibility:** Define cave card invalidation and equality.

**Required logic:**

- Remove equality comparisons for live XP, population, comfort, food, heat, or any other value rendered through live bindings.
- Compare structural fields only.
- Preserve invalidation breadth required for structural changes.

**Tests:**

- Changing food current value alone compares equal.
- Changing heat current value alone compares equal.
- Changing comfort current value alone compares equal.
- Changing Habiti compares unequal.
- Changing per-body bonus attributes compares unequal.

## 9.4 `src/ui/runtime/world/selection/cave/CaveCard.tsx`

**Status:** Change existing file.

**Responsibility:** Subscribe cave card to structural cave data and render the view.

**Required logic:**

- Replace `useRuntimeSelector` with `useImperativeRuntimeDerivedValue` unless a stronger existing granular mechanism is already used.
- Do not subscribe the React card shell to live-bound current values.

**Tests:** Covered by cave render-optimization test.

## 9.5 `src/ui/runtime/world/selection/card-display/resolveCaveCardModel.ts`

**Status:** Change existing file.

**Responsibility:** Convert cave card data into `SelectionCardModel`.

**Required logic:**

- Render title from cave label.
- Render cave XP through live compact-fraction binding if live paths exist.
- Render population through `numeric-text` binding.
- Render comfort through `numeric-text` binding with percent formatting and progress binding.
- Render food and heat through live compact-fraction binding and progress binding.
- Anchor food/heat upkeep effects to food/heat capsules when those capsules exist.
- Render per-body bonus capsules using the agreed value/effect grammar.
- Render Habiti and Understanding through shared capsule adapters.
- Render residual effects only for effects not anchored to local capsules.
- Supply description to `SelectionCardModel.description`; renderer places it last.

**Required interface:** Existing export may remain.

**Tests:**

- Food and heat render as live-bound fraction capsules with progress.
- Comfort renders as live-bound percent capsule with progress.
- Food/heat effects anchor locally and do not duplicate in residual Effects.
- Habiti and Understanding render with cave-owned skin.
- Cave description appears after sections.
- Cave card shell does not rerender when only food/heat/comfort current values change.

## 10. File-level design: job card delta

## 10.1 `src/ui/runtime/world/selection/job-card/jobCardTypes.ts`

**Status:** Change existing file.

**Responsibility:** Define job card data used to build display models.

**Required interface delta:**

- Preserve current job card data needed by power jobs and assignment jobs.
- Expose data required to model all display-only content as sections and capsules:
    - power demand/contribution values
    - cycle status binding data
    - next-cycle effect groups
    - storage bars/effects
    - assignment requirements
    - suspicious activity indicator
    - action-control custom slot keys where required
- Do not embed display-only React nodes in data.

**Tests:** Existing job data tests must be updated to assert model-ready data, not old component wiring.

## 10.2 `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`

**Status:** Change existing file.

**Responsibility:** Resolve job card domain data.

**Required logic:**

- Preserve current job-selection semantics.
- Preserve existing job analysis helpers for resource gain effects, cycle status, storage, requirements, and suspicious activity.
- Do not duplicate analysis logic in TSX files.
- Return data sufficient for `resolvePowerJobCardModel` or `resolveAssignmentJobCardModel`.

**Tests:** Existing resolver tests must still pass after expected shape updates.

## 10.3 `src/ui/runtime/world/selection/card-display/resolvePowerJobCardModel.ts`

**Status:** Change existing file.

**Responsibility:** Convert power job data into `SelectionCardModel`.

**Required logic:**

- Replace old `PowerMatrix` display with one or more generic sections of value capsules.
- Replace old `CycleAbilityDisplay` with a generic cycle/status capsule using existing cycle countdown binding.
- Replace old `NextCycleEffectsDisplay` with generic effect capsules grouped by section when grouping is semantically meaningful.
- Use `adaptAbilityBarsToCapsules` for storage/progress bars instead of duplicating ability-bar logic.
- Preserve all visible data currently shown by the old power job card.
- Use custom slot only for non-display controls.

**Required interface:** Existing export may remain.

**Tests:**

- Power demand/contribution values are visible as capsules.
- Cycle status/countdown is visible through generic capsule.
- Next-cycle effects are visible as capsules.
- Storage/progress display uses adapted capsules.
- No old power matrix/cycle/next-cycle components are imported by the view.

## 10.4 `src/ui/runtime/world/selection/card-display/resolveAssignmentJobCardModel.ts`

**Status:** Change existing file.

**Responsibility:** Convert assignment job data into `SelectionCardModel`.

**Required logic:**

- Replace old `AssignmentRequirementsSection` display with generic requirement capsules.
- Preserve requirement labels, states, and tooltips currently visible.
- Preserve assignment action controls through custom slot only.
- Preserve body selection modal behavior outside the display model.

**Tests:**

- Assignment requirements are visible as generic capsules.
- Requirement satisfied/unsatisfied visual state is represented by capsule skin/emphasis.
- Assignment action controls still render through custom slot.
- No old assignment requirements component is imported by the view.

## 10.5 `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`

**Status:** Change existing file.

**Responsibility:** Render power job card through `CardModelView`.

**Required logic:**

- Stop importing `PowerMatrix`, `CycleAbilityDisplay`, and `NextCycleEffectsDisplay`.
- Resolve power job model.
- Pass allowed custom slots only for non-display controls.
- Render `CardModelView`.

**Tests:** Covered by power job card view tests and import-search check.

## 10.6 `src/ui/runtime/world/selection/job-card/AssignmentJobCardView.tsx`

**Status:** Change existing file.

**Responsibility:** Render assignment job card through `CardModelView` while preserving action controls.

**Required logic:**

- Stop importing `AssignmentRequirementsSection`.
- Resolve assignment job model.
- Provide custom slot for assignment controls/modal only.
- Render `CardModelView`.

**Tests:** Covered by assignment job card tests and import-search check.

## 10.7 `src/ui/runtime/world/selection/job-card/JobCardView.tsx`

**Status:** Change existing file only if current branching prevents generic rendering.

**Responsibility:** Dispatch to power or assignment job view without containing display logic.

**Required logic:**

- Preserve current job type selection behavior.
- Do not import old display-only components.

**Tests:** Existing job card tests updated to new rendered output.

## 11. File-level design: resource, transfer, and display cards

## 11.1 `src/ui/runtime/world/selection/card-display/resolveResourceCardModel.ts`

**Status:** Verify and change if needed.

**Responsibility:** Convert resource card data into `SelectionCardModel`.

**Required logic:**

- Use `adaptAbilityBarsToCapsules` or existing storage bar models for storage displays.
- Use live text and progress bindings for current storage where available.
- Description, tooltip, and action behavior must flow through shared renderers.

**Tests:**

- Storage amount updates without rerendering card body.
- Visible storage data is preserved.
- Description renders last if present.

## 11.2 `src/ui/runtime/world/selection/card-display/resolveTransferCardModel.ts`

**Status:** Verify and change if needed.

**Responsibility:** Convert transfer card data into `SelectionCardModel`.

**Required logic:**

- Replace raw stat rows with generic value capsules.
- Preserve all visible current transfer information from existing card.
- Use shared tooltip/action contracts if transfer rows expose tooltip/action data.

**Tests:**

- Existing visible transfer values remain visible.
- Values render through generic capsules.

## 11.3 `src/ui/runtime/world/selection/card-display/resolveDisplayCardModel.ts`

**Status:** Verify and change if needed.

**Responsibility:** Convert generic display card data into `SelectionCardModel`.

**Required logic:**

- Render title through `CardTitleBlock`.
- Render description through `CardDescriptionBlock` after sections.
- Preserve existing visible display text.

**Tests:**

- Title and description remain visible.
- Description follows card model order.

## 12. File-level design: detritus deletion

## 12.1 Deletion rule

A file listed in this section must be deleted only after both checks pass:

```pseudocode
repository import search finds no non-test imports
replacement tests for the equivalent behavior pass
```

If a listed file is still imported by non-test code, the migration is incomplete and deletion must not occur.

## 12.2 Files to delete after migration

### Body display detritus

Delete after body card no longer imports them:

- `src/ui/runtime/world/selection/body/BodyCardContent.tsx`
- `src/ui/runtime/world/selection/body/BodyIdentity.tsx`
- `src/ui/runtime/world/selection/body/BodyXpAndLevel.tsx`
- `src/ui/runtime/world/selection/ability-display/HealthAbilityDisplay.tsx` if no other live card uses it; otherwise keep and document its remaining owner.
- `src/ui/runtime/world/selection/components/AttributesList.tsx`
- `src/ui/runtime/world/selection/components/ModifierList.tsx`
- `src/ui/runtime/world/selection/components/TraitList.tsx`
- `src/ui/runtime/world/selection/components/HabitiList.tsx`
- `src/ui/runtime/world/selection/components/HabitiList.styles.ts`

Delete or rewrite corresponding tests:

- `src/ui/runtime/world/selection/components/AttributesList.test.tsx`
- `src/ui/runtime/world/selection/components/ModifierList.test.tsx`
- `src/ui/runtime/world/selection/components/TraitList.test.tsx`
- `src/ui/runtime/world/selection/components/HabitiList.test.tsx`

### Cave display detritus

Delete after cave card no longer imports them:

- `src/ui/runtime/world/selection/cave/CaveVitalsSection.tsx`
- `src/ui/runtime/world/selection/cave/CaveSustainmentSection.tsx`
- `src/ui/runtime/world/selection/cave/CaveCapabilitiesSection.tsx`
- `src/ui/runtime/world/selection/cave/LiveNumericValue.tsx`
- `src/ui/runtime/world/selection/cave/useLiveNumericValue.ts`

Delete or rewrite corresponding tests:

- `src/ui/runtime/world/selection/cave/CaveSustainmentSection.test.tsx`
- `src/ui/runtime/world/selection/cave/LiveNumericValue.test.tsx`

### Job display detritus

Delete after job views no longer import them:

- `src/ui/runtime/world/selection/job-card/PowerMatrix.tsx`
- `src/ui/runtime/world/selection/job-card/CycleAbilityDisplay.tsx`
- `src/ui/runtime/world/selection/job-card/NextCycleEffectsDisplay.tsx`
- `src/ui/runtime/world/selection/absorption/AssignmentRequirementsSection.tsx` if assignment job cards were the only non-absorption display owner; otherwise keep and document remaining absorption owner.

Delete or rewrite corresponding tests:

- `src/ui/runtime/world/selection/job-card/PowerMatrix.test.tsx`

## 13. Testing design

## 13.1 Shared display tests

### `src/ui/runtime/world/selection/card-display/atoms/CapsuleFrame.test.tsx`

**Responsibility:** Verify capsule skins render valid surfaces.

**Cases:**

- Every skin renders without throwing.
- Warning, danger, and success skins do not produce undefined border/background/color values.
- Plain and value skins are visually non-pill surfaces according to testable class/style markers.

### `src/ui/runtime/world/selection/card-display/atoms/InteractiveFrame.test.tsx`

**Responsibility:** Verify click affordance and dispatch behavior.

**Cases:**

- No action means no `ⓘ`.
- Callback action renders `ⓘ` and calls callback.
- Codex action dispatches through `onAction`.
- Disabled action renders `ⓘ` and does not dispatch.

### `src/ui/runtime/world/selection/card-display/molecules/CardTitleBlock.test.tsx`

**Responsibility:** Verify title rendering and action/tooltip behavior.

**Cases:**

- Text-only title.
- Icon title.
- Avatar title.
- Avatar wins over icon.
- Tooltip appears.
- Action dispatches.

### `src/ui/runtime/world/selection/card-display/molecules/CardDescriptionBlock.test.tsx`

**Responsibility:** Verify description rendering and action/tooltip behavior.

**Cases:**

- Rich text description visible.
- Default narration variant is used.
- Tooltip appears.
- Action dispatches.

### `src/ui/runtime/world/selection/card-display/molecules/Section.test.tsx`

**Responsibility:** Verify section rendering and custom slot behavior.

**Cases:**

- Titled capsule section.
- Untitled capsule section.
- Section-title action only.
- Known custom slot renders.
- Unknown custom slot does not crash and logs according to project logging convention if available.

### `src/ui/runtime/world/selection/card-display/organisms/CardModelView.test.tsx`

**Responsibility:** Verify whole-model rendering contract.

**Cases:**

- Null model renders null.
- Title, sections, and description render in order.
- Description is after sections.
- Conditional notice renders for modeled entity ID.
- `onAction` propagates to every actionable child kind.

## 13.2 Entity-state-link tests

### `src/ui/runtime/world/entity-state-link/entityStateLinkTextRuntime.test.ts`

**Responsibility:** Verify live text resolution.

**Cases:**

- Existing compact fraction behavior remains unchanged.
- Existing duration behavior remains unchanged.
- Existing cycle countdown behavior remains unchanged.
- `numeric-text` compact number resolves and updates.
- `numeric-text` integer percent resolves and updates.
- Missing value path uses fallback.
- Missing value path without fallback displays empty text.
- Binding equality includes every `numeric-text` field.

### `src/ui/runtime/world/selection/card-display/molecules/LiveValueText.test.tsx`

**Responsibility:** Verify rendered live text updates without parent rerender.

**Cases:**

- Bound text appears after entity-state-link sync.
- Mutating only bound runtime value changes span text.
- Parent render count does not increase when only bound value changes.

## 13.3 Body tests

### `src/ui/runtime/world/selection/card-display/resolveBodyCardModel.test.ts`

**Responsibility:** Verify model shape and display grammar for body card.

**Cases:**

- Attribute capsules show effective value and parenthesized nonzero modifiers.
- Zero attribute modifier is omitted.
- XP capsule has compact-fraction live binding and XP-rate effect.
- Health capsule has compact-fraction live binding, microbar progress binding, and anchored health effects.
- Residual effects exclude anchored attribute/health effects.
- Habiti use correct skins.

### `src/ui/runtime/world/selection/body/bodyCardHydration.test.ts`

**Responsibility:** Verify body equality ignores live-bound current values and detects structural changes.

**Cases:**

- XP current change alone compares equal.
- Health current change alone compares equal.
- XP rate change compares unequal.
- Base attribute change compares unequal.
- Effective attribute change compares unequal.
- Habiti change compares unequal.

### `src/ui/runtime/world/selection/body/BodyCard.live.test.tsx`

**Responsibility:** Verify optimized body rendering.

**Cases:**

- Initial card shows title, attributes, XP, health, Habiti, description.
- Updating only XP current value updates XP text and does not rerender card shell/body content.
- Updating only health current value updates health text/bar and does not rerender card shell/body content.
- Updating an attribute rerenders only the structural path needed to display changed attribute.

## 13.4 Cave tests

### `src/ui/runtime/world/selection/card-display/resolveCaveCardModel.test.ts`

**Responsibility:** Verify cave model shape and display grammar.

**Cases:**

- XP, population, comfort, food, and heat use live text bindings where available.
- Comfort uses percent format.
- Food and heat use fraction plus progress.
- Food/heat effects anchor locally.
- Habiti and Understanding use cave-owned skin.
- Residual Effects excludes anchored local effects.

### `src/ui/runtime/world/selection/cave/caveCardHydration.test.ts`

**Responsibility:** Verify cave equality ignores live-bound current values and detects structural changes.

**Cases:**

- Food current change compares equal.
- Heat current change compares equal.
- Comfort current change compares equal.
- Habiti change compares unequal.
- Per-body bonus attribute change compares unequal.

### `src/ui/runtime/world/selection/CaveCard.live.test.tsx`

**Responsibility:** Verify optimized cave rendering.

**Cases:**

- Updating only food current value updates food text/bar and does not rerender card shell.
- Updating only heat current value updates heat text/bar and does not rerender card shell.
- Updating only comfort current value updates comfort text/bar and does not rerender card shell.

## 13.5 Job tests

### `src/ui/runtime/world/selection/card-display/resolvePowerJobCardModel.test.ts`

**Responsibility:** Verify power job display model replaces old display components.

**Cases:**

- Power demand/contribution values render as capsules.
- Cycle status/countdown renders as generic capsule.
- Next-cycle effects render as generic capsules.
- Storage/progress values render through adapted ability bar capsules.
- Residual effects are not duplicated.

### `src/ui/runtime/world/selection/card-display/resolveAssignmentJobCardModel.test.ts`

**Responsibility:** Verify assignment job display model replaces assignment requirements display.

**Cases:**

- Requirements render as generic capsules.
- Satisfied requirement uses success or neutral emphasis according to existing visual convention.
- Unsatisfied requirement uses warning/danger emphasis according to existing visual convention.
- Assignment controls are represented by a custom slot key, not React nodes in the model.

### Existing job card view tests

Update existing tests to assert the same user-visible behavior through the new generic renderer. Do not keep tests that assert old component structure.

## 13.6 Deletion/import-search tests

There is no unit test for deletion. The completion check is a repository search.

Required import-search checks:

```pseudocode
search for BodyCardContent
search for BodyIdentity
search for BodyXpAndLevel
search for HealthAbilityDisplay
search for AttributesList
search for ModifierList
search for TraitList
search for HabitiList
search for CaveVitalsSection
search for CaveSustainmentSection
search for CaveCapabilitiesSection
search for LiveNumericValue
search for useLiveNumericValue
search for PowerMatrix
search for CycleAbilityDisplay
search for NextCycleEffectsDisplay
search for AssignmentRequirementsSection
```

Only references in deleted files, historical notes, or intentionally retained non-lens owners are acceptable. Any non-test in-scope lens import is a failure.

## 14. Acceptance checklist

### 14.1 Shared renderer

- [ ] `CapsuleFrame` produces valid styles for every skin.
- [ ] `InteractiveFrame` implements callback and dispatcher actions.
- [ ] Title, description, section title, and capsules all support tooltip/action contracts.
- [ ] `CardModelView` renders description last.
- [ ] `CardModelView` uses slot-based custom content.
- [ ] `SelectionCardModel` no longer requires arbitrary React nodes for display content.

### 14.2 Live rendering

- [ ] `numeric-text` binding exists and is tested.
- [ ] Existing text binding kinds still work.
- [ ] Live text updates through entity-state-link without parent rerender.
- [ ] Live progress updates through entity-state-link without parent rerender.

### 14.3 Body card

- [ ] Body attributes display `[icon] value (modifier)`.
- [ ] Attribute modifiers are computed from effective minus base attributes.
- [ ] XP displays live `current/max` and XP rate.
- [ ] Health displays live `current/max`, progress, and local health effects.
- [ ] Body residual Effects excludes anchored local effects.
- [ ] Body description renders after sections.
- [ ] Body card shell does not rerender for XP/health current-value ticks.

### 14.4 Cave card

- [ ] Cave XP, population, comfort, food, and heat use live bindings where paths exist.
- [ ] Food/heat effects anchor locally.
- [ ] Cave Habiti and Understanding render through shared capsule adapters.
- [ ] Cave residual Effects excludes anchored local effects.
- [ ] Cave description renders after sections.
- [ ] Cave card shell does not rerender for food/heat/comfort current-value ticks.

### 14.5 Job cards

- [ ] Power job cards do not import `PowerMatrix`, `CycleAbilityDisplay`, or `NextCycleEffectsDisplay`.
- [ ] Assignment job cards do not import `AssignmentRequirementsSection` for display content.
- [ ] Job requirements, power values, cycle status, next-cycle effects, and storage displays are rendered as generic sections/capsules.
- [ ] Assignment controls remain functional through custom slots.

### 14.6 Detritus

- [ ] Body display detritus deleted or explicitly retained only when still owned by a non-lens feature.
- [ ] Cave display detritus deleted.
- [ ] Job display detritus deleted or explicitly retained only when still owned by a non-lens feature.
- [ ] Obsolete tests deleted or rewritten to test the new generic display system.
- [ ] Import-search checks pass.

### 14.7 Quality

- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Full tests pass.
- [ ] No TODOs are introduced.
- [ ] No new magic styling values are introduced.
- [ ] No simulation behavior changes are made.

## 15. Non-negotiable constraints

1. Do not create another display abstraction beside `card-display`.
2. Do not keep old display-only systems as parallel production code.
3. Do not put business logic in `.tsx` files.
4. Do not use React state for hover styling.
5. Do not embed fast-changing live values into equality-sensitive card models when entity-state-link can render them.
6. Do not hide broken action descriptors by rendering them as passive content.
7. Do not delete files before import-search proves they are unused.
8. Do not change gameplay semantics to make the UI migration easier.
9. Do not invent package commands; read repository package metadata before running verification.
10. Do not leave tests that assert obsolete component structure.

