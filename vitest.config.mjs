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
    // Auto-unmount React trees after each test (prevents floating-ui rAF leaking
    // past jsdom teardown → "window is not defined"; node tests skip via guard).
    setupFiles: ['./vitest.setup.ts'],
    // Emit machine-readable test results so the PDD snapshot can track test count.
    reporters: ['default', 'json'],
    outputFile: { json: 'reports/vitest/results.json' },
    coverage: {
      provider: 'v8',
      // json-summary emits coverage/coverage-summary.json (totals) for the PDD
      // proof-trend snapshot; the rest are vitest's defaults.
      reporter: ['text', 'html', 'clover', 'json', 'json-summary'],
      thresholds: {
        statements: 81,
        branches: 68,
        functions: 78,
        lines: 84,
      },
    },
  },
});
