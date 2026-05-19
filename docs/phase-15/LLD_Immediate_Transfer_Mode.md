# LLD: Immediate Transfer Mode (Physical vs Immediate)

**Owner:** Alex Tavor  
**Scope:** Runtime transfers, Upkeep authoring + compiler, editor UI, tests  
**Status:** Proposed (LLD)  
**Last updated:** 2026-02-19  

---

## 0) Summary (One sentence)

Add an explicit `isImmediate` flag to transfer payloads so `TransferHandler` can deterministically choose between **immediate mutation** (no pending transfer body) and the existing **physical transfer** flow, and expose this as an Upkeep editor toggle with end-to-end schema, compiler, runtime wiring, and contract tests.

---

## 1) Why

### 1.1 Current state
Transfers currently have exactly one runtime behavior:

- Debit source
- Create a **pending transfer entity/body**
- Add target-side **incoming ledger**
- Rely on the impulse system + resolve/cancel handlers to eventually apply the credit

This is correct for gameplay cases where transfers should:
- take time
- be visible as a physical entity
- be cancellable/interruptible in flight

### 1.2 Problem
Some transfer producers (especially **Upkeep auto-request**) are not meaningfully “physical” and should not:
- create pending bodies
- add incoming ledger entries
- depend on resolve/cancel

They should instead resolve in the same tick, during the apply phase, while still enforcing:
- source sufficiency
- target capacity clamping
- deterministic apply-phase mutation

### 1.3 Goal
Introduce a **single explicit flag** in the transfer payload, and use it as the only switch in `TransferHandler`:

- `isImmediate === true` → immediate debit + credit (no pending body)
- missing/false → existing physical behavior unchanged

### 1.4 Non-goals (explicit)
- No new transfer visualization for immediate mode
- No change to cancel/resolve mechanics for physical transfers
- No refactor of the impulse engine
- No changes to the meaning of `allowDeposit` (it remains the deposit-permission gate)
- No usage of `validateTransferPermissions` in `TransferHandler` (intentionally removed; it is unrelated to deposits)

---

## 2) What

### 2.1 New flag
Add an optional boolean field:

- **Name:** `isImmediate`
- **Type:** `boolean`
- **Default:** `false` (by omission)

### 2.2 Where it exists
The flag MUST exist in all layers that represent transfers:

1. **Authored behavior action**: `TRANSFER` action schema
2. **Runtime command payload**: `TRANSFER_ASSETS` payload
3. **Upkeep ability schema**: `isImmediate` field
4. **Upkeep editor**: toggle bound to the schema field

### 2.3 Meaning (contract)
- If `isImmediate === true`, the transfer MUST:
  - debit source
  - credit target
  - do so immediately in `TransferHandler` (apply phase)
  - NOT create pending transfer entities/bodies
  - NOT touch target incoming ledger
- If `isImmediate !== true`, the transfer MUST behave exactly as it does today (physical).

### 2.4 Backwards compatibility
- All existing content and commands remain valid.
- Missing `isImmediate` means physical mode.

---

## 3) How (Implementation)

## 3.1 TransferHandler contract

### 3.1.1 Decision table
| `command.payload.isImmediate` | Runtime behavior |
|---|---|
| `true` | immediate mutation: debit + credit |
| `false` / `undefined` | existing physical transfer |

### 3.1.2 Shared validation (both modes)
Both modes MUST run the same pre-flight logic, in this order:

1. Resolve `source` and `target` entities by id  
2. Validate deposits via `allowDeposit` (external transfers only)  
3. Compute clamped payload using `calculateTransaction({ source, target, payload })`  
4. If unsuccessful, log error (if provided) and return  
5. If clamped total is 0 → log “target at capacity” and return  
6. If clamped total < `MIN_TRANSFER_THRESHOLD` → return silently (unchanged behavior)

Only after passing these gates can the handler perform either:
- immediate mutation, or
- physical transfer creation

### 3.1.3 Deposit permission rules (explicit)
- If `sourceId !== targetId` (external transfer):
  - for every `[resource, amount]` where `amount > 0`
  - the target MUST have `allowDeposit[resource] === true`
  - otherwise the transfer MUST abort (no partial transfers)

- If `sourceId === targetId` (self transfer):
  - deposit checks are skipped

This preserves the existing semantics.

---

## 3.2 Immediate transfer semantics

### 3.2.1 What is mutated
Immediate transfers MUST mutate only these two entities:

- `source.state[resource].value -= clampedAmount`
- `target.state[resource].value += clampedAmount`

No other runtime objects may be mutated for immediate transfers:
- no pending entities
- no impulse bodies
- no incoming ledger

### 3.2.2 Determinism constraints
Immediate transfers occur in `TransferHandler`, which runs during apply-phase command handling.  
No other phase may apply the immediate credit.

---

## 3.3 Physical transfer semantics
If `isImmediate !== true`, the handler MUST execute the current behavior unchanged:

- debit source
- create pending transfer entity/body
- add incoming ledger on target
- register impulse body + target

This branch must remain byte-for-byte identical except for being wrapped by the new mode switch.

---

## 4) File-by-file changes (Responsibilities, Interfaces, Logic)

> **Standard:** Every file listed below must have one clear responsibility.  
> No file may silently re-interpret `isImmediate`.  
> The only place that decides mode is `TransferHandler`.

---

## 4.1 Runtime payload type

### File: `src/engine/runtime/types/runtimeCommandPayloadsBase.ts`

**Responsibility**  
Defines canonical TypeScript interfaces for runtime command payloads.

**Change**  
Extend `TransferAssetsCommandPayload`:

```ts
export interface TransferAssetsCommandPayload {
  sourceId: string;
  targetId: string;
  payload: Record<string, number>;
  isImmediate?: boolean; // NEW
}
```

**Interface contract**
- Optional; omission means physical.

---

## 4.2 Behavior schema (TRANSFER action)

### File: `src/data/schemas/behavior.ts`

**Responsibility**  
Defines zod schemas and TS types for authored behavior actions.

**Change**  
Extend `TransferActionSchema`:

```ts
export const TransferActionSchema = z.object({
  type: z.literal("TRANSFER"),
  source: z.string(),
  target: z.string(),
  resource: z.string(),
  amount: ActionValueSchema,
  isImmediate: z.boolean().optional(), // NEW
});
```

**Interface contract**
- Optional; omission means physical.

---

## 4.3 Behavior executor → runtime command

### File: `src/engine/runtime/systems/behavior/actionExecutorTransfer.ts`

**Responsibility**  
Converts a compiled/authored `TRANSFER` action into a runtime `TRANSFER_ASSETS` command.

**Logic**
- Resolve source/target ids exactly as today.
- Compute the numeric amount exactly as today.
- If `action.isImmediate === true`, set `payload.isImmediate = true`.
- Otherwise omit the field.

**Exact output shape**
```ts
commands.enqueue({
  type: RuntimeCommandType.TRANSFER_ASSETS,
  payload: {
    sourceId,
    targetId,
    payload: { [action.resource]: amount },
    ...(action.isImmediate === true ? { isImmediate: true } : {}),
  },
});
```

**Interface contract**
- No other fields are added.
- The executor never defaults the flag to true.

---

## 4.4 Upkeep ability schema

### File: `src/data/schemas/abilities/upkeep.ts`

**Responsibility**  
Defines HLL schema for Upkeep ability authoring.

**Change**
Add optional boolean:

```ts
export const UpkeepAbilitySchema = z.object({
  resource: z.string().min(1),
  rate: ScalableValueSchema.default({ base: 0, perBody: 0 }),
  failureTrait: z.string().min(1),
  autoRequest: z.boolean().default(true),
  isImmediate: z.boolean().optional(), // NEW
});
```

**Interface contract**
- Only affects compilation of auto-request transfer rules.
- If `autoRequest === false`, `isImmediate` MUST have no effect.

---

## 4.5 Upkeep compiler

### File: `src/engine/compiler/abilities/upkeepCompiler.ts`

**Responsibility**  
Compiles Upkeep HLL entries into LLL passiveEffects/behavior rules.

**Change**
When `autoRequest === true`, the compiler emits a `TRANSFER` action.
That action MUST include `isImmediate: true` iff `config.isImmediate === true`.

**Exact emission**
- If `config.isImmediate === true`:

```ts
actions: [{
  type: "TRANSFER",
  source: `tag:storage:${resource}`,
  target: "self",
  resource,
  amount: `self.state.${demandKey}.value`,
  isImmediate: true,
}]
```

- Else: emit exactly as today, with no `isImmediate` field.

**Contract notes**
- The compiler MUST NOT emit `isImmediate: false`.
- The compiler MUST NOT emit transfers when `autoRequest === false`.

---

## 4.6 Shared transfer utilities (credit helper)

### File: `src/engine/runtime/handlers/transferResources.ts`

**Responsibility**  
Shared utilities for transfer mutation logic.

**Change**
Add a single canonical helper:

```ts
export const creditResources = (
  entity: RuntimeEntity,
  payload: Record<string, number>,
  log: CommandHandlerContext["telemetry"]["log"],
): void => { ... }
```

**Logic contract**
For each `[resource, amount]`:
- If `amount` is not finite or `<= 0`: log error and continue
- Ensure `entity.state` exists
- If state entry missing: create `{ value: amount, visible: false }`
- If existing `entry.value` is not a number: log error and continue
- Else: `entry.value += amount`

**Hard constraint**
- This helper MUST NOT re-clamp to max. Clamping is owned by `calculateTransaction`.

---

## 4.7 TransferHandler

### File: `src/engine/runtime/handlers/TransferHandler.ts`

**Responsibility**  
Executes `TRANSFER_ASSETS` commands during apply-phase runtime.

**Change**
Branch on `command.payload.isImmediate === true`.

#### Immediate branch (new)
After shared validation + clamping gates:

1. `debitResources(source, clampedPayload)`
2. `creditResources(target, clampedPayload, context.telemetry.log)`
3. Do NOT:
   - touch `target.ledger.incoming`
   - spawn pending transfer entity
   - register impulse bodies
4. Emit tick log:
   - MUST include `sourceId`, `targetId`, and the final clamped payload

#### Physical branch (existing)
Unchanged behavior:
- debit
- ledger incoming
- pending entity
- impulse registration

**Hard constraints**
- `TransferHandler` MUST NOT call `validateTransferPermissions`
- `TransferHandler` is the ONLY file that decides mode

---

## 5) UI wiring (Upkeep editor)

## 5.1 Draft defaults

### File: `src/ui/devtools/editors/blueprint/mode/abilityDrafts.ts`

**Responsibility**  
Defines default draft objects inserted into `_editor.abilities`.

**Change**
Update `createUpkeepAbilityDraft`:

```ts
isImmediate: false,
```

**Contract**
- New authored entries must have stable, explicit editor state.

---

## 5.2 Upkeep form

### File: `src/ui/devtools/editors/blueprint/mode/forms/UpkeepAbilityForm.tsx`

**Responsibility**  
Renders upkeep fields and writes draft values (no business logic).

**Change**
Add toggle:

- Label: `Immediate Transfer`
- Path: `${basePath}.isImmediate`
- Tooltip: “If enabled, auto-request transfers resolve immediately (no pending transfer body). Only applies when Auto-Request is enabled.”

**Behavior**
- Toggle is always visible.
- If `autoRequest === false`, the toggle may be disabled in UI, but the compiler is the source of truth.

---

## 6) Tests (Complete, Contract-driven)

> **Standard:** Tests must prove:
> - the mode switch is correct
> - physical behavior is unchanged
> - immediate behavior is deterministic and side-effect constrained
> - wiring is end-to-end from Upkeep → compiler → behavior → runtime

---

## 6.1 Runtime: TransferHandler

### File: `src/engine/runtime/handlers/TransferHandler.test.ts`

#### Test 1: immediate transfer mutates both entities and creates no physical artifacts
**Given**
- source has `bodies = 10`
- target has `bodies = 1`
- `payload = { bodies: 5 }`
- `isImmediate = true`

**When**
- handler executes

**Then**
- source bodies == 5
- target bodies == 6
- world contains no pending transfer entity
- target ledger has no incoming entry for `bodies`

#### Test 2: physical transfer remains unchanged when isImmediate missing
**Given**
- same setup, but omit `isImmediate`

**Then**
- source debited
- pending entity exists
- target ledger incoming updated
- impulse registration called

This test is mandatory to prevent regressions.

#### Test 3: immediate mode respects target clamping
**Given**
- target is near max capacity
- transfer amount exceeds remaining capacity
- `isImmediate = true`

**Then**
- credited amount equals clamped amount
- source debited by clamped amount (not requested amount)

---

## 6.2 Runtime: deposit permission gate

### File: `src/engine/runtime/handlers/TransferHandler.permissions.test.ts`

#### Test: immediate transfers still respect allowDeposit
**Given**
- `sourceId !== targetId`
- target disallows deposit for `bodies`
- `isImmediate = true`

**Then**
- no mutation to source or target
- no pending entity
- error log contains “disallows”

---

## 6.3 Behavior executor

### File: `src/engine/runtime/systems/behavior/ActionExecutor.actions.test.ts`

#### Test: isImmediate propagates into TRANSFER_ASSETS payload
**Given**
- `TRANSFER` action with `isImmediate: true`

**Then**
- emitted runtime command payload includes `isImmediate: true`

---

## 6.4 Compiler: Upkeep

### File: `src/engine/compiler/abilities/upkeepCompiler.test.ts`

#### Test 1: compiler emits isImmediate when enabled
**Given**
- upkeep config `{ autoRequest: true, isImmediate: true }`

**Then**
- request rule action includes `isImmediate: true`

#### Test 2: compiler omits isImmediate when disabled
**Given**
- upkeep config `{ autoRequest: true }` or `{ isImmediate: false }`

**Then**
- request rule action has no `isImmediate` key

#### Test 3: autoRequest false emits no request transfer (and isImmediate ignored)
**Given**
- upkeep config `{ autoRequest: false, isImmediate: true }`

**Then**
- no request transfer rule exists

---

## 6.5 UI: Upkeep editor

### File: `src/ui/devtools/editors/blueprint/mode/UpkeepComponents.test.tsx`

#### Test: Immediate Transfer toggle renders
**Given**
- render UpkeepAbilityForm

**Then**
- label `Immediate Transfer` exists

#### Test: toggle binds to draft path
(Optional but recommended if the test harness supports user events)
- click toggle
- verify `_editor.abilities.upkeep[i].isImmediate` updates

---

## 7) Migration / Data handling

### 7.1 Existing data
No migration required.

- Old content does not include `isImmediate`.
- Default behavior remains physical.

### 7.2 New data
- Upkeep editor writes explicit `isImmediate: false` for new entries.
- Compiler only emits `isImmediate: true` when enabled.

---

## 8) Risk analysis (bounded)

### Risk: accidental change to physical transfers
Mitigation:
- Mandatory regression test “physical transfer unchanged when isImmediate missing”.

### Risk: double-clamping or inconsistent credit logic
Mitigation:
- Clamping remains exclusively in `calculateTransaction`.
- Immediate credit helper is simple and does not clamp.

### Risk: partial permission checks
Mitigation:
- Deposit check is explicit and identical for both modes.

---

## 9) Acceptance criteria (strict)

1. `TRANSFER_ASSETS.payload.isImmediate` exists and is optional.
2. `TransferHandler` branches solely on `payload.isImmediate === true`.
3. Immediate mode:
   - debits source
   - credits target
   - does not create pending transfer entity
   - does not touch incoming ledger
4. Physical mode unchanged when flag omitted/false.
5. Upkeep editor exposes a toggle bound to upkeep schema.
6. Upkeep compiler emits `TRANSFER` action with `isImmediate: true` only when enabled.
7. Behavior executor propagates the flag into runtime command payload.
8. Tests cover:
   - immediate happy path
   - physical regression path
   - clamping
   - deposit rejection
   - compiler wiring
   - executor wiring
   - UI rendering

---

## 10) Explicit ambiguity elimination checklist

- Default behavior is physical by omission. **Yes**
- Only `TransferHandler` decides mode. **Yes**
- Immediate mode does not create any physical artifacts. **Yes**
- Deposit permissions are enforced for immediate and physical. **Yes**
- `validateTransferPermissions` is not used. **Yes**
- Compiler never emits `isImmediate: false`. **Yes**
- Tests include a physical-regression guard. **Yes**
