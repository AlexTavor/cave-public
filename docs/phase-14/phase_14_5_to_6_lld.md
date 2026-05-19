Phase 14.5 & 14.6 Low-Level Design: Serialization, Validation & Workspace

Status: Approved for Implementation
Dependencies: Phase 14.1 - 14.4 (Engine Core & Linker)
Context: context-pack.md, phase_14_engine_hld.md

This document defines the implementation details for the final stages of the V2 Engine Architecture transition. It covers the mechanism for safely writing runtime data back to disk (Serialization & Gatekeeping) and the tools for managing the project lifecycle (Workspace & Refactoring).

Phase 14.5: The Gatekeeper (Serializer & Validation)

1. Conceptual Model

The Runtime operates on Fully Qualified IDs (FQ IDs) (e.g., content/forest::orc) to ensure global uniqueness. However, source files on disk must remain modular and use Relative IDs (e.g., orc inside content/forest.json) where possible.

The ModuleSerializer is responsible for the "De-compilation" step: converting FQ IDs back to Relative IDs based on the target file's namespace.

The Gatekeeper is the safety net. It runs after serialization but before disk write. It simulates the link process to ensure the new state represents a valid, compile-able project without broken references.

2. Components

2.1 src/engine/linker/ModuleSerializer.ts

Responsibility: Transforming a runtime BlueprintV2 object into a disk-ready plain object by stripping local namespaces and enforcing schema shape.

Interface:

import { BlueprintV2 } from "./types";

export interface SerializationContext {
targetNamespace: string; // e.g., "content/forest"
}

export class ModuleSerializer {
/\*\*
_ Converts a runtime blueprint to a disk-safe format.
_ 1. Deep clones the input using src/utils/objectUtils.
_ 2. Recursively walks all string values.
_ 3. If a value matches `{targetNamespace}::{id}`, replaces it with `{id}`.
_ 4. Strips runtime-only fields (specifically 'computed' properties).
_/
static serializeBlueprint(
blueprint: BlueprintV2,
context: SerializationContext
): unknown;
}

Logic:

Clone: const clone = deepClone(blueprint) (from src/utils/objectUtils.ts).

Recursive Walk: Implement a private recursive function visit(node: unknown):

If typeof node === 'string', apply Namespace Stripping.

If Array.isArray(node), map visit over elements.

If typeof node === 'object', map visit over values.

Namespace Stripping:

Regex match for ^(.+)::(.+)$.

If match found:

const [full, namespace, id] = match.

If namespace === context.targetNamespace, return id.

Else, return original string.

Schema Pruning:

Delete keys that are strictly runtime caches if present (e.g., \_computed).

Testing Strategy (Unit):

Given a blueprint with ID content/forest::orc and a ref content/forest::goblin.

When serialized with target namespace content/forest.

Then output ID is orc and ref is goblin.

When serialized with target namespace content/caves.

Then output ID is content/forest::orc (FQ preserved) and ref is content/forest::goblin.

Invariant: Ensure the original object passed in is not mutated.

2.2 src/engine/linker/Gatekeeper.ts

Responsibility: Preventing corruption of the project by simulating the link result of a proposed change.

Interface:

import { ReferenceIndex, BrokenReference } from '../registry/types';
import { ModuleCartridge } from '../../data/schemas/module';
import { ModuleLinker } from './ModuleLinker';

export class ValidationError extends Error {
constructor(
public readonly brokenRefs: BrokenReference[],
public readonly schemaErrors: string[]
) {
super("Validation Failed");
}
}

export class Gatekeeper {
constructor(private readonly linker: ModuleLinker) {}

    /**
     * Simulates adding the payload to the current project state
     * and checks for validity.
     * @throws ValidationError if references break or schema fails.
     */
    async validatePayload(
        currentModules: Record<string, ModuleCartridge>,
        filename: string,
        payload: ModuleCartridge
    ): Promise<void>;

}

Logic:

Virtual Merge: Create a shallow copy of currentModules.

const virtualState = { ...currentModules }.

virtualState[filename] = payload.

Schema Validation: Run ModuleCartridgeSchema.parse(payload). Collect errors.

Ref Check:

Collect all existingIds from all modules in virtualState (using buildBlueprintHeaders).

Run walkReferences on payload.

Check if any targetId found in the payload is missing from existingIds.

Throw: If broken refs or schema errors exist, throw ValidationError.

Testing Strategy (Unit):

Given a mock set of modules where A exists.

When validating a payload that references B (which does not exist).

Then throws ValidationError containing the broken path to B.

Happy Path: Validate a payload referencing A (exists). Assert no error is thrown.

2.3 src/engine/terminal/commands/projectSaveCommand.ts

Responsibility: CLI command to persist a blueprint.

Usage: project.save_blueprint <fq_id>

Logic:

Context: Access WorkspaceService to get activeRuntime and activeCartridge.

Resolve: Find the runtime entity/blueprint for <fq_id> in activeCartridge.

Locate: Identify the source filename.

Iterate WorkspaceService.moduleCache.

Find the module whose namespace matches the fq_id prefix.

Serialize: Call ModuleSerializer.serializeBlueprint with the module's namespace.

Merge:

Load the current ModuleCartridge for that file.

Update the specific blueprint entry with the serialized result.

Validate: Call Gatekeeper.validatePayload with the updated cartridge.

Write: Call vfs.writeFile.

Output: Return success or formatted error message.

Phase 14.6: Workspace & Refactoring Tools

1. Conceptual Model

The Workspace is the "Session". It owns the Runtime, the Linker, and the FileSystem interface. It is the root of the IDE state.

Refactoring logic relies on the fact that file paths map 1:1 to namespaces. Moving a file implies a namespace change, which requires updating all references globally.

2. Components

2.1 src/engine/workspace/WorkspaceService.ts

Responsibility: Lifecycle management of the Engine session.

Interface:

import { Runtime } from '../runtime/Runtime';
import { RuntimeCartridge } from '../linker/types';
import { ModuleCartridge } from '../../data/schemas/module';
import { FileSystem } from '../vfs/FileSystem';
import { ModuleLinker } from '../linker/ModuleLinker';

export class WorkspaceService {
public activeRuntime: Runtime | null = null;
public activeCartridge: RuntimeCartridge | null = null;

    // Maps filename -> raw ModuleCartridge (cache)
    public readonly moduleCache: Map<string, ModuleCartridge> = new Map();

    constructor(
        private readonly vfs: FileSystem,
        private readonly linker: ModuleLinker
    ) {}

    async createProject(path: string, name: string): Promise<void>;
    async loadProject(manifestPath: string): Promise<void>;
    async closeProject(): Promise<void>;

    /** Returns list of all FQ IDs for autocomplete */
    getSymbols(): string[];

    /** * Reloads specific modules from disk and REPLACES the runtime.
     * No hot-patching allowed per architecture laws.
     */
    async reloadModules(filenames: string[]): Promise<void>;

}

Logic:

createProject: Uses vfs to create folder and basic manifest.json.

loadProject:

Parses manifest.

Loops through files, uses linker (logic extracted from linkProject into loadModule) to populate moduleCache.

Calls linker.linkProject (modified to accept cache or path) to generate RuntimeCartridge.

activeRuntime = new Runtime(...).

reloadModules:

Updates moduleCache entries for the provided filenames via vfs.

Re-runs linker to produce a new RuntimeCartridge.

Destroys old runtime.

activeRuntime = new Runtime(...).

2.2 src/engine/workspace/RefactorService.ts

Responsibility: Atomic multi-file refactoring (Rename/Move).

Interface:

import { WorkspaceService } from './WorkspaceService';
import { FileSystem } from '../vfs/FileSystem';

export class RefactorService {
constructor(
private readonly workspace: WorkspaceService,
private readonly vfs: FileSystem
) {}

    /**
     * Renames a namespace (folder or file) and updates all references.
     * @param oldNamespace e.g. "content/forest"
     * @param newNamespace e.g. "content/biomes/forest"
     */
    async moveNamespace(oldNamespace: string, newNamespace: string): Promise<void>;

}

Logic:

Impact Analysis:

Target string: ${oldNamespace}::.

Replacement string: ${newNamespace}::.

Affected Files: Scan workspace.moduleCache. Identify any module containing the Target string in values.

Transformation:

For each affected module:

Recursively walk object.

Replace value occurrences of ${oldNamespace}:: with ${newNamespace}::.

Store modified modules in a pendingWrites map.

Filesystem Transaction:

Perform vfs.movePaths to rename the source file/folder on disk.

Perform vfs.writeFile for every entry in pendingWrites.

Update manifest.json if the moved path was explicitly listed.

Reload:

Call workspace.loadProject to refresh the state from the new disk layout.

Testing Strategy (Integration):

Given a mock VFS with A.json defining entityA and B.json ref'ing A::entityA.

When moveNamespace("A", "C").

Then vfs.movePaths was called for A -> C.

Then B.json content was updated to ref C::entityA.

Then manifest.json was updated.

2.3 src/engine/terminal/commands/projectCommands.ts

Responsibility: CLI exposure.

Commands:

project.create <name>: calls workspace.createProject.

project.load <path>: calls workspace.loadProject.

project.close: calls workspace.closeProject.

project.move <old_path> <new_path>:

Converts paths to namespaces (strip extensions).

Calls refactorService.moveNamespace.

3. Testing Strategy Checklist

3.1 Unit Tests (src/engine/linker/ModuleSerializer.test.ts)

Happy Path: Serialize a complex blueprint with mixed relative/absolute refs.

Edge Case: Blueprint with no namespace (global).

Edge Case: Blueprint with arrays of refs (e.g., traits: []).

Invariant: Input object must not be mutated.

3.2 Integration Tests (src/engine/workspace/RefactorService.test.ts)

Setup: Use a Mock VFS (in-memory map).

Scenario:

Create A.json defining entityA.

Create B.json referencing A::entityA.

Refactor A -> C.

Assert B.json content now references C::entityA.

Assert A.json is gone and C.json exists.

3.3 Gatekeeper Tests (src/engine/linker/Gatekeeper.test.ts)

Negative Path: Validate a blueprint referencing a non-existent ID. Assert ValidationError.

Negative Path: Validate a blueprint with a schema violation. Assert ValidationError.

Happy Path: Validate a blueprint with valid references. Assert success (void return).

3.4 Workspace Service Tests (src/engine/workspace/WorkspaceService.test.ts)

Scope: Integration of VFS + Linker + Runtime.

Setup: Real ModuleLinker, Mock FileSystem.

Lifecycle Scenario:

Given an empty VFS.

When createProject("test").

Then test/manifest.json exists.

When loadProject.

Then activeRuntime is instantiated.

Reload Scenario:

Given a running project.

When reloadModules is called.

Then activeRuntime.id changes (proving replacement, not mutation).

Then activeCartridge reflects the new module data.

4. Execution Plan

Scaffold: Create src/engine/workspace directory.

Serializer: Implement ModuleSerializer with strict recursive deep cloning.

Gatekeeper: Implement Gatekeeper utilizing the referenceIndex logic.

Workspace: Implement WorkspaceService, ensuring strict runtime destruction on reload.

Refactor: Implement RefactorService with search-and-replace logic.

Terminal: Wire up all commands.
