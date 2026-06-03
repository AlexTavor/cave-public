import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';

// Flat config (ESLint v9+). Restores the lint/complexity gate: @eslint/js + typescript-eslint
// recommended + react-hooks + sonarjs (cognitive/cyclomatic complexity). Non-type-checked
// (no parserOptions.project) to keep it fast, matching a CI lint gate.
export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-ssr',
      'coverage',
      'reports',
      'constraints',
      'src/vite-env.d.ts',
      '**/*.config.{js,mjs,cjs,ts}',
      'vite/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // TypeScript's compiler (the `build` gate) already errors on undefined identifiers; in a
      // flat config the core rule only produces false positives on TS types/ambient globals.
      'no-undef': 'off',
      // Error (not warn) so it's captured in the suppressions baseline and new violations are
      // gated; the lint script runs at --max-warnings 0, which would otherwise fail on warnings.
      'react-hooks/exhaustive-deps': 'error',
      // Determinism (no Math.random in src/engine) is owned by the dependency-cruiser/determinism
      // constraint, which is engine-scoped, exempts *.bench.ts, and FIXES the 4 engine sites
      // rather than freezing them. Disabled here to avoid double-coverage and to avoid baselining
      // that fixable debt. See constraints/ + the enforced-constraints handoff.
      'sonarjs/pseudo-random': 'off',
    },
  },
  {
    // Determinism: the headless balancing runner replays runs, so engine code must derive
    // randomness from (worldSeed/epochSeed, stableId) via src/utils/pseudoRandom.ts — never
    // Math.random. Benchmarks are exempt (not on the sim path). This is the engine-scoped
    // replacement for the global sonarjs/pseudo-random rule (which also flagged UI/bench).
    files: ['src/engine/**/*.{ts,tsx}'],
    ignores: ['src/engine/**/*.bench.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Determinism: Math.random is banned in src/engine. Seed via src/utils/pseudoRandom.ts from (worldSeed, stableId).',
        },
      ],
    },
  },
);
