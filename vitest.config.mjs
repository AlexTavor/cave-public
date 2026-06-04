import { defineConfig } from 'vitest/config';

// Root Vitest config — picked up by `npm test` and `npm run coverage` (bare vitest).
//
// Purpose: the coverage-floor gate. `npm run coverage` fails if coverage drops below the
// floor, set just under current (stmts 82.8 / branch 69.8 / funcs 79.7 / lines 85.0) so it
// catches regressions without flaking. Ratchet the floor UP as coverage improves.
//
// Per-file environment comes from `// @vitest-environment` docblocks (260 UI test files use
// jsdom); the default stays `node`, matching prior bare-vitest behavior, so this config adds
// the gate without changing how tests run. Stryker uses its own config
// (vitest.stryker.config.mjs) and is unaffected.
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 81,
        branches: 68,
        functions: 78,
        lines: 84,
      },
    },
  },
});
