import type { ModuleCartridge } from "../../data/schemas/module";

export interface ResourceProvider {
    /** Checks if a file exists in the VFS or loaded modules */
    hasFile: (filename: string) => boolean;

    /** Returns valid keys (e.g. asset IDs) for a specific category */
    resolveModuleKeys: (filename: string, category: string) => string[];

    /** Returns a loaded module when available (for rich metadata/labels) */
    getModule?: (filename: string) => ModuleCartridge | null;
    /** Returns all loaded modules (for cross-module autocomplete) */
    getModules?: () => ModuleCartridge[];
}

export interface RuntimeProvider {
    /** Returns list of active entity IDs from the ECS world */
    getActiveEntityIds: () => string[];
    /** Returns list of blueprint IDs available in the currently loaded cartridge */
    getLoadedBlueprintIds: () => string[];
    /**
     * Returns the runtime handle when available — opaque to lib, which sits below
     * the engine and cannot name `Runtime`. The ui host narrows it to the real
     * Runtime at the boundary via `getCommandRuntime`.
     */
    getRuntime?: () => unknown;
    /** Load a cartridge into the runtime */
    loadCartridge?: (cartridge: ModuleCartridge, seed?: string) => void;
    /** Start the runtime tick loop */
    play?: () => void;
    /** Pause the runtime tick loop */
    pause?: () => void;
    /** Step the runtime by one tick */
    step?: () => number | null;
    /** Unload current runtime cartridge and stop loop */
    unload?: () => void;
    /** Reset runtime state (clear entities, commands, restart world) */
    reset?: () => void;
}
