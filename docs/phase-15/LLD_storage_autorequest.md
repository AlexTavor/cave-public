# LLD --- Storage Auto-Request + Request Source Override + Incoming-Aware Values

**Owner:** Alex Tavor (@alex)\
**Date:** 2026-02-22 (Europe/Amsterdam)\
**Status:** Draft for implementation (LLD)

---

# Why

Current gameplay expectation:

- The Cave (`sys_world`) must keep its food and heat storage full at
  all times.
- Bodies must ONLY pull from `sys_world`.
- Incoming transfers must be transparently treated as part of current
  value.

Today this fails because:

- Consumers default to `tag:storage:[resource]`, which may not match
  intent.
- `ledger.incoming` exists but is not included in value resolution.
- Storage does not own a "keep full" behavior.

Goals (locked decisions):

- Cave auto-requests to remain full.
- Bodies request only from `sys_world`.
- Cadence is cycle-based in seconds.
- No hysteresis; use `minRequest` threshold.
- Incoming must be transparent to HLL.

---

# What

## Feature 1 --- Storage owns Auto-Request

Add optional `autoRequest` block to Storage ability.

Rules:

- `need = max - currentValue`
- `currentValue` includes `ledger.incoming`
- If `need < minRequest`: do not request
- `requestAmount = min(need, maxRequest)`
- Repeat every `cadence_s` seconds

---

## Feature 2 --- Request Source Override

Expose editor field allowing:

- Literal entity id (`"sys_world"`)
- Tag selector (`"tag:storage:food"`)
- `"self"`

Bodies will set `requestSource = "sys_world"`.

---

## Feature 3 --- Incoming-Aware Values

Modify value resolution so:

    self.state.<resource>.value

returns:

    state.value + ledger.incoming[resource]

Transparent to HLL.

---

# How

## A. Schema Changes

### storage.ts

Add:

```ts
autoRequest: z.object({
    enabled: z.boolean().default(false),
    cadence_s: z.number().positive().default(1),
    source: z.string().optional(),
    minRequest: z.number().nonnegative().default(1),
    maxRequest: z.number().positive().default(999999),
}).optional();
```

Refinements:

- If enabled: `cadence_s > 0`
- `minRequest <= maxRequest`

---

### upkeep.ts

Add:

```ts
requestSource: z.string().optional();
```

Compiler fallback:

    const source = config.requestSource ?? `tag:storage:${resource}`

---

## B. Compiler Changes

### storageCompiler.ts

Add hidden state:

    auto_req_<resource>_timer_<i>
    auto_req_<resource>_need_<i>

Emit rules:

1.  Timer accumulate
2.  Compute need
3.  Transfer when need \<= maxRequest
4.  Transfer when need \> maxRequest

Transfers use:

    source = config.autoRequest.source
    target = self
    isImmediate = true

Guard against `sourceId === targetId`.

---

### upkeepCompiler.ts

Use `requestSource` if provided.

Bodies default to `sys_world`.

---

## C. Runtime Changes

### valueResolverPath.ts

Modify resolve so:

    self.state.food.value

returns:

    value + ledger.incoming.food

Applies to any entity reference.

---

### actionExecutorTransfer.ts

Add guard:

    if (sourceId === targetId) return;

---

## D. Editor Changes

### StorageAbilityForm.tsx

Add Auto-Request section with tooltips:

- Enabled
- Cadence (seconds)
- Source
- Min Request
- Max Request

Validation:

- `minRequest <= maxRequest`
- `cadence_s > 0`

---

### UpkeepAbilityForm.tsx

If autoRequest enabled:

Add Request Source field with tooltip:

> Overrides default storage lookup. Use `sys_world` for bodies.

---

# Default Data Changes

- `sys_world` storage(food, heat): enable autoRequest
- Egg storage: allowWithdraw = true
- Bodies: upkeep autoRequest.requestSource = "sys_world"

---

# Testing Plan

## Compiler Tests

- Emits correct rules
- Respects min/max thresholds
- Does nothing when disabled

## Runtime Tests

- Incoming included in value resolution
- Transfer amount clamped
- No self-transfer

## Integration Tests

- Cave pulls from Egg
- Bodies pull only from sys_world

## Editor Tests

- Fields render
- Tooltips present
- Validation enforced

---

# Review Checklist

- Contains Why / What / How: YES
- Defines interfaces clearly: YES
- Complete: YES
- Thorough testing: YES
- No ambiguity remaining in behavior: YES

