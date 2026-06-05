# lib-boundaries

**Enforced by `npm run depcruise`** (dependency-cruiser, `error`). A follow-on to `module-boundaries`.

## The rule

`src/lib` holds shared modules the engine builds **on** — engine imports lib at ~40 sites — so lib sits **below** engine in the layering, alongside data/utils.

| Rule | Statement |
|---|---|
| `lib-stays-low` | `src/lib` MUST NOT import `engine` / `game` / `ui` / `app-shell`. May use `data` + `utils` + `lib`. |

## Debt — ratcheted (6 violations, baseline 40 → 46)

Frozen in `.dependency-cruiser-known-violations.json`. The gate passes today and fails on any NEW violation.

| Violation | Kind | Burn-down |
|---|---|---|
| `displays/resolveDisplaySource.ts → engine/.../AvatarDisplayConstants` | constant | **Easy** — move the constant down (to `lib/displays` or `data`); engine re-imports it from there. |
| `terminal/types.providers.ts → engine/runtime/Runtime` | type | Invert — `terminal` declares the interface it needs; engine satisfies it. |
| `terminal/components/SmartInput.tsx → ui/...` | UI coupling | **Design question** — `lib/terminal` ships React components that import `ui/`. Either those components belong in `ui/`, or their UI deps should be injected. |

(+ 2 test-file violations alongside the source ones above.)

- **See the debt:** `npm run depcruise:debt`
- **Burn it down:** fix, then regenerate — `depcruise src --config .dependency-cruiser.cjs --output-type baseline > .dependency-cruiser-known-violations.json`. The count only ratchets down.
