Phase 14.1 Low-Level Design: VFS & Infrastructure

1. Introduction

1.1 Purpose

This phase establishes the foundational file system capabilities required for the IDE architecture. We are transitioning from single-file operations to batch-capable, recursive operations (scan, tree, move, delete) to support project management and refactoring tools.

Additionally, this phase expands the Terminal Infrastructure to support interactive, multi-step commands (e.g., confirmation prompts), allowing complex operations to be handled entirely within the command line interface without relying on browser modals.

1.2 Scope

VFS Layer: Enhancing FileSystem.ts and IndexedDBPersistence.ts with batch and structural operations.

Terminal Core: Upgrading CommandRegistry and TerminalStore to support command sessions (input interception).

Terminal Commands: Implementing the fs.\* command suite.

API Contract: Defining the expected behavior of the Vite editor middleware.

2. API Contracts & Types

We define the shared data structures for file operations. These types will be used by the VFS, Persistence layer, and Terminal.

2.1 Data Structures

File: src/engine/vfs/types.ts (New File)

export interface MoveItem {
from: string;
to: string;
}

export interface ScanOptions {
glob?: string;
recursive?: boolean;
}

export interface TreeNode {
name: string;
path: string;
type: "file" | "directory";
children?: TreeNode[];
}

export interface BatchResult {
success: boolean;
modified: string[];
errors: string[];
}

2.2 Terminal Types (Expanded)

File: src/lib/terminal/types.ts (Update)

We expand CommandResult to optionally return a handler for the next user input, enabling multi-step flows.

// Expanded definition
export type CommandInputHandler = (
input: string,
context: ExecutionContext
) => Promise<CommandResult>;

export interface CommandResult {
type: LogType;
content: ReactNode;
// If present, the terminal will route the NEXT input to this handler
// instead of the main registry.
next?: CommandInputHandler;
}

2.3 Server API Contract (Vite Plugin)

The FileSystem will communicate with the dev server using these endpoints.

Method

Endpoint

Body

Description

POST

/\_\_editor/scan

{ glob: string }

Returns string[] of matching paths.

POST

/\_\_editor/tree

{ root: string }

Returns TreeNode structure.

DELETE

/\_\_editor/delete

{ paths: string[] }

Deletes multiple files/folders.

POST

/\_\_editor/move

{ items: MoveItem[] }

atomic rename/move.

3. VFS Layer Design

3.1 FileSystem.ts

Responsibility: The primary facade for all file operations. It routes requests to the Dev Server (in dev) or IndexedDB (in prod).

Changes:

Implement deletePaths, movePaths, scan, tree.

Add batch support for atomic operations (future-proofing).

// src/engine/vfs/FileSystem.ts

import { MoveItem, TreeNode } from "./types";

export class FileSystem {
// ... existing constructor

    /**
     * Bulk delete files or directories.
     */
    async deletePaths(paths: string[]): Promise<void> {
        if (this.isDev) {
            await this.fetcher("/__editor/delete", {
                method: "DELETE",
                body: JSON.stringify({ paths }),
            });
        } else {
            await this.db.deleteMany(paths);
        }
    }

    /**
     * Bulk move/rename files or directories.
     */
    async movePaths(items: MoveItem[]): Promise<void> {
        if (this.isDev) {
            await this.fetcher("/__editor/move", {
                method: "POST",
                body: JSON.stringify({ items }),
            });
        } else {
            await this.db.moveMany(items);
        }
    }

    /**
     * Scan for files matching a glob pattern.
     */
    async scan(glob: string): Promise<string[]> {
        if (this.isDev) {
            const res = await this.fetcher("/__editor/scan", {
                method: "POST",
                body: JSON.stringify({ glob }),
            });
            return res.json();
        } else {
            return this.db.scan(glob);
        }
    }

    /**
     * Get a hierarchical tree view of a directory.
     */
    async tree(root: string = ""): Promise<TreeNode> {
        if (this.isDev) {
            const res = await this.fetcher("/__editor/tree", {
                method: "POST",
                body: JSON.stringify({ root }),
            });
            return res.json();
        } else {
            return this.db.getTree(root);
        }
    }

}

3.2 IndexedDBPersistence.ts

Responsibility: Provide equivalent capabilities for the in-browser storage to ensure the IDE features work (mostly) in production builds.

Changes:

Implement deleteMany (transactional).

Implement moveMany (transactional copy + delete).

Implement scan (regex matching on keys).

Implement getTree (reconstruct tree from flat keys).

// src/engine/vfs/IndexedDBPersistence.ts

export class IndexedDBPersistence<T> implements PersistenceAdapter<T> {
// ... existing methods

    async deleteMany(keys: string[]): Promise<void> {
        // Implementation: Iterate keys, start transaction, delete all.
        // Support folder deletion by checking for prefix matches.
    }

    async moveMany(items: MoveItem[]): Promise<void> {
        // Implementation:
        // 1. Load all source items.
        // 2. Write to new keys.
        // 3. Delete old keys.
        // All within a readwrite transaction.
    }

    async scan(glob: string): Promise<string[]> {
        // Implementation:
        // 1. getAllKeys()
        // 2. Convert glob to Regex (simple implementation or use micromatch/minimatch library if size permits, otherwise simple suffix/prefix match).
        // For 14.1, simple prefix/suffix/wildcard matching is sufficient.
    }

    async getTree(root: string): Promise<TreeNode> {
        // Implementation:
        // 1. getAllKeys()
        // 2. Filter by root prefix.
        // 3. Build object hierarchy from "/" delimited strings.
        // 4. Convert to TreeNode.
    }

}

4. Terminal Infrastructure Enhancements

To support confirmation dialogs ("Are you sure? [y/N]") within the terminal, we need to upgrade the execution loop.

4.1 Terminal Logic Updates

File: src/ui/devtools/state/useTerminalStore.ts

Changes:

State: Add activeSession: CommandInputHandler | null.

Submit Logic:

If activeSession exists, bypass registry.execute and call activeSession(input).

If the result contains next, update activeSession.

If result has no next, clear activeSession (return to standard REPL).

// Logic Flow in submitCommand:
const { activeSession } = get();

let result: CommandResult;

if (activeSession) {
// We are in a multi-step command (e.g. confirming delete)
result = await activeSession(command, context);
} else {
// Standard execution
result = await registry.execute(command, context);
}

// Handle transition
if (result.next) {
set({ activeSession: result.next });
} else {
set({ activeSession: null });
}

// Log result...

5. Terminal Commands

Location: src/engine/terminal/commands/fsCommands.ts (New File)
Registration: Import and add to STANDARD_COMMANDS in src/engine/terminal/commands.ts.

5.1 fs.tree

Usage: fs.tree [path]

Logic: Calls vfs.tree(path). Renders a recursive ASCII tree view.

Output:

.
├── content
│ ├── forest.blueprint
│ └── desert.blueprint
└── system
└── impulse.sys

5.2 fs.scan

Usage: fs.scan <glob>

Logic: Calls vfs.scan(glob). Returns a flat list of matching files.

Output: List of strings.

5.3 fs.delete

Usage: fs.delete <path...>

Logic:

Parse paths.

Check if any path is a directory or if multiple files are selected.

If risky: Return a CommandResult with type warning ("Delete 5 files? This cannot be undone.") and a next handler.

Next Handler: Checks if input is "y" or "yes". If so, calls vfs.deletePaths. If not, returns "Aborted".

Interactive Flow:

> fs.delete content/forest
> [WARN] You are about to delete 1 directory. This cannot be undone.
> [WARN] Confirm? [y/N]
> y
> [SUCCESS] Deleted content/forest

5.4 fs.move

Usage: fs.move <from> <to>

Logic:

Calls vfs.movePaths([{ from, to }]).

Future: Support moving multiple files into a directory if the last arg is a directory. For 14.1, strictly 1-to-1 renaming is fine.

6. Verification & Tests

6.1 Unit Tests (src/engine/vfs/FileSystem.test.ts)

Mock: fetch global.

Happy Paths:

deletePaths: Calls DELETE /\_\_editor/delete with correct JSON body.

scan: Calls POST /\_\_editor/scan and returns array.

tree: Calls POST /\_\_editor/tree and returns node.

movePaths: Calls POST /\_\_editor/move with items array.

Negative Paths:

scan: Handles 500 error from server (throws structured error).

deletePaths: Handles 404/Partial failure if server reports it.

Edge Cases:

Call with empty arrays (should no-op, no network request).

Call with invalid paths (e.g., ../../ attempts, though backend should catch, frontend should sanitize).

6.2 Integration Tests (src/engine/vfs/IndexedDBPersistence.test.ts)

Setup: fake-indexeddb.

Happy Paths:

moveMany: Renames keys, values persist.

deleteMany: Removes specified keys.

getTree: Returns correct hierarchy for a/b/c.

Edge Cases:

moveMany: Moving A -> B where B already exists (overwrite behavior check).

deleteMany: Deleting a prefix dir/ correctly removes dir/file.txt.

scan: Empty pattern returns all or nothing (define behavior).

6.3 Command Tests (src/engine/terminal/commands/fsCommands.test.ts)

Setup: CommandHandlerContext with mocked vfs.

Cases:

fs.delete (Simple):

fs.delete file.txt -> calls vfs.deletePaths immediately (if safe).

fs.delete (Interactive):

fs.delete dir/ -> returns result with next handler.

Invoke handler with 'n' -> returns "Aborted", vfs.deletePaths NOT called.

Invoke handler with 'y' -> calls vfs.deletePaths, returns "Deleted".

fs.tree:

Renders output string matching expected ASCII format.

fs.move:

fs.move a b -> calls vfs.movePaths([{ from: 'a', to: 'b' }]).

Missing args -> returns error.

fs.scan:

fs.scan _.json -> calls vfs.scan('_.json').

7. Implementation Plan (14.1)

Types: Create src/engine/vfs/types.ts and update src/lib/terminal/types.ts.

Persistence: Update IndexedDBPersistence with batch/scan logic.

VFS: Update FileSystem with new methods and dev/prod switching.

Terminal Core: Update useTerminalStore to handle activeSession and next callbacks.

Commands: Implement fsCommands.ts with confirmation logic for delete.

Wiring: Register commands in commands.ts.
