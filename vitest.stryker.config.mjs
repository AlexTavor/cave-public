import { defineConfig } from 'vitest/config';

// Dedicated Vitest config used ONLY by Stryker mutation runs.
//
// MUTATE scope (the code being mutated) is set in stryker.config.json -> src/engine/compiler/**.
//
// This file sets the KILLER scope (tests allowed to kill those mutants): every non-UI test that
// exercises the compiler. The compiler is consumed directly by runtime/game/linker/logic tests
// (e.g. runtime BehaviorSystem tests import compiler factories), so counting only compiler-dir
// tests undercounts the real mutation score. Verified: these 5 dirs run green under the node env
// (no jsdom / no setup file), and no other non-UI dir imports the compiler.
//
// Excluded by omission: src/ui (jsdom) and src/engine/phaser (canvas) — DOM-bound, won't run under
// node; physics/lib/data — do not import the compiler.
//
// Does not affect `npm test` (Stryker references this file explicitly via stryker.config.json).
export default defineConfig({
  test: {
    include: [
      'src/engine/compiler/**/*.{test,spec}.{ts,tsx}',
      'src/engine/runtime/**/*.{test,spec}.{ts,tsx}',
      'src/engine/linker/**/*.{test,spec}.{ts,tsx}',
      'src/engine/logic/**/*.{test,spec}.{ts,tsx}',
      'src/game/**/*.{test,spec}.{ts,tsx}',
    ],
    environment: 'node',
  },
});
