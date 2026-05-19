import type { ModuleCartridge } from "../../../../data/schemas/module";

type EnsureModuleSessionDeps = {
    hasSession: () => boolean;
    loadModule: (filename: string) => Promise<void>;
    getModule: (filename: string) => ModuleCartridge | null;
    initSession: (filename: string, module: ModuleCartridge) => void;
};

const pendingInitializations = new Map<string, Promise<void>>();

export const ensureModuleSessionOnce = async (
    filename: string,
    deps: EnsureModuleSessionDeps,
): Promise<void> => {
    if (!filename || deps.hasSession()) {
        return;
    }

    const existing = pendingInitializations.get(filename);
    if (existing) {
        await existing;
        return;
    }

    const work = (async () => {
        if (deps.hasSession()) return;
        if (!deps.getModule(filename)) {
            await deps.loadModule(filename);
        }
        if (deps.hasSession()) return;
        const module = deps.getModule(filename);
        if (module) {
            deps.initSession(filename, module);
        }
    })()
        .catch((error) => {
            console.error(
                `Failed to initialize session for ${filename}`,
                error,
            );
        })
        .finally(() => {
            pendingInitializations.delete(filename);
        });

    pendingInitializations.set(filename, work);
    await work;
};

export const resetPendingSessionLoads = () => {
    pendingInitializations.clear();
};

