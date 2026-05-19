Refactoring Plan: Test Factories

This document defines the execution plan to eliminate test fixture duplication via the Factory Pattern.

1. New Infrastructure

File: src/engine/test/factories.ts
Responsibility: Provide centralized, type-safe generators for core data structures.

Low Level Design (LLD):

import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import type { ModuleCartridge } from "../../data/schemas/module";
import type { Blueprint } from "../../data/schemas/blueprint";
import type { RuntimeEntity } from "../runtime/types";

/\*\*

- Creates a valid ModuleCartridge with sensible defaults.
- @param id - The cartridge ID (and filename).
- @param overrides - Partial data to merge.
  \*/
  export const createCartridge = (id: string, overrides: Partial<ModuleCartridge> = {}): ModuleCartridge => ({
  metadata: {
  id,
  name: "Test Cartridge",
  version: "0.0.1",
  ...overrides.metadata,
  },
  blueprints: overrides.blueprints ?? {},
  assets: {
  icons: {},
  resources: {},
  styles: {},
  traits: {},
  ...overrides.assets,
  settings: {
  impulse: DEFAULT_IMPULSE_CONFIG,
  ...overrides.assets?.settings,
  },
  },
  });

/\*\*

- Creates a valid Blueprint.
- Defaults to having a Display component matching the ID.
  \*/
  export const createBlueprint = (id: string, overrides: Partial<Blueprint> = {}): Blueprint => ({
  id,
  label: id,
  tags: [],
  components: {
  display: { label: id, icon: "unknown" },
  ...overrides.components,
  },
  passiveEffects: [],
  ...overrides,
  });

/\*\*

- Creates a RuntimeEntity.
- Useful for world.add() calls.
  \*/
  export const createEntity = (id: string, overrides: Partial<RuntimeEntity> = {}): RuntimeEntity => ({
  id,
  tags: [],
  ...overrides,
  });

2. Refactoring Execution

Group A: Engine Runtime Handlers

Target Directory: src/engine/runtime/handlers/

handlerTestUtils.ts:

Import createCartridge from factories.

Remove local makeCartridge or default object creation.

Update makeHandlerContext to accept cartridge?: ModuleCartridge and default to createCartridge("core").

SpawnHandler.test.ts:

Replace local makeCartridge with createCartridge.

Use createBlueprint for populating the cartridge blueprints.

TransferHandler.test.ts:

Replace world.add({...}) literals with world.add(createEntity("source", { ... })).

KillHandler.test.ts, ResolveTransferHandler.test.ts, CancelTransferHandler.test.ts, PositionHandler.test.ts:

Replace entity literals with createEntity.

PatchBlueprintHandler.test.ts:

Replace makeCartridge with createCartridge.

Use createBlueprint to set up initial state.

Group B: DevTools State Store

Target Directory: src/ui/devtools/state/

moduleStore.store.test.ts:

Remove local makeModule function.

Replace with createCartridge.

Where blueprints are needed, use createBlueprint.

moduleStore.blueprints.test.ts:

Remove local makeModule.

Replace usage with createCartridge.

moduleStore.assets.test.ts:

Remove local makeModule.

Replace with createCartridge.

moduleStore.index.test.ts, moduleStore.reducer.test.ts:

Replace manual object literals with createCartridge and createBlueprint.

Group C: UI Component Tests

Target Directory: src/ui/devtools/editors/

assets/AssetEditorFlow.test.tsx:

Replace baseModule literal with createCartridge.

assets/useAssetSession.test.tsx:

Replace baseModule literal with createCartridge.

behaviors/autocomplete/behaviorStateMachine.test.ts:

Replace moduleData literal with createCartridge.

Replace draft literals with createBlueprint.

behaviors/autocomplete/schemaIntrospection.test.ts:

Replace moduleData literal with createCartridge.

Replace draft literal with createBlueprint.

behaviors/useBehaviorSuggestions.test.ts:

Replace baseModule literal with createCartridge.

physics/useLayoutPhysicsSession.test.tsx:

Replace baseModule literal with createCartridge.

fields/module-explorer/asset-grid/useAssetGrid.test.ts (if applicable/existing):

Ensure consistency with above.

Group D: VFS & Runtime Terminal

Target Directories: src/engine/vfs/, src/ui/runtime/

src/engine/vfs/FileSystem.test.ts:

Replace disk/db mock objects with createCartridge.

src/engine/vfs/bootstrap.test.ts:

Replace literals with createCartridge.

src/ui/runtime/terminal/commands/gameNewCommand.test.ts:

Replace makeCartridge with createCartridge.

src/ui/runtime/terminal/commands/transferCommands.test.ts:

Replace mock entity literals with createEntity.

src/ui/devtools/terminal/AutocompleteFlow.test.tsx:

Replace baseModule with createCartridge.

3. Implementation Checklist

[ ] Create src/engine/test/factories.ts.

[ ] Refactor Group A (Engine Handlers).

[ ] Refactor Group B (DevTools State).

[ ] Refactor Group C (UI Editors).

[ ] Refactor Group D (VFS & Terminal).

[ ] Verify all tests pass (npx vitest).

[ ] Verify no instances of DEFAULT_IMPULSE_CONFIG exist in test files (except factories).
