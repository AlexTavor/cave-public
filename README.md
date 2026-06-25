# Cave

A browser-based management and simulation game built on a custom data-driven engine. Game content is authored as JSON blueprints with composable abilities. A compiler turns those blueprints into the runtime components that run physics, resource logistics, trait systems, and progression.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-2%2C814%20passing-brightgreen?logo=vitest&logoColor=white)](docs/promo/cave-tests-run.png)
[![Coverage](https://img.shields.io/badge/Coverage-83%25-brightgreen)](docs/promo/cave-coverage.png)[![Circular deps](https://img.shields.io/badge/Circular%20deps-0-brightgreen)](https://github.com/sverweij/dependency-cruiser)

**Play it:** https://speaks-with-stone.itch.io/cave

![Gameplay](docs/promo/gameplay-screenshot-13-05-2026.png)

## The engine

Most of the work in Cave is in the engine. Content is defined as data, and the engine runs it.

- Data-driven: every entity, ability, and system is defined in JSON and validated against Zod schemas at the boundary.
- A high-level ability language (HLL) compiles blueprints into runtime components.
- A quadtree-backed impulse engine runs the physics and spatial simulation.
- Resource logistics, trait and habitus systems, and progression are built on the same set of components.

![Editor](docs/promo/tools-screenshot-13-05-2026.png)

## How it's built

Cave is written end-to-end by AI coding agents. They work inside a fixed architecture, with deterministic build gates and a full test suite. The implementation is automated; the architecture and the quality bar are fixed by hand. From the actual build: **2,814 tests** at **83% coverage**, **zero circular dependencies** across 13,000+ import edges, and **zero runtime CVEs**.

## Getting started

```bash
npm install
cp .env.example .env   # optional: add your PostHog token for analytics
npm run dev
```

## Tech stack

- **React 19** + **Vite** (app shell and UI)
- **Phaser 3** (world rendering)
- **Zustand** + **Immer** (state management)
- **Zod** (schema validation for all engine data)
- **IndexedDB** (save persistence)
- **Custom impulse engine** (quadtree-backed physics)
- **PostHog** (optional analytics)

## Documentation

- [DSL Manual](docs/manuals/dsl_manual.md): blueprint schema, components, behavior actions, scripting language
- [Abilities Manual (HLL)](docs/manuals/hll_manual.md): the high-level ability compiler reference
- [Data Architecture](docs/manuals/data_architecture.md): design philosophy, economic model, trait and habitus systems

## Project structure

```
src/
  app-shell/     # app lifecycle, save/load
  engine/        # core simulation: linker, compiler, systems
  data/          # Zod schemas for all engine data
  game/          # game-specific logic
  ui/            # React UI (runtime, production, menus)
  lib/           # shared utilities and display logic
docs/
  phase-*/       # HLD and LLD design documents per feature phase
  manuals/       # engine reference
```
