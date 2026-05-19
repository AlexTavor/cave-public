import type { ModuleCartridge } from "../../../data/schemas/module";
import { vfs } from "../../../engine/vfs/FileSystem";
import { readProjectManifest } from "../../../engine/workspace/projectManifest";
import { useModuleStore } from "../state/moduleStore";
import { useSessionStore } from "../state/useSessionStore";

const isEligibleTextFile = (filename: string) =>
    /\.(bp|draft|cave)$/i.test(filename);

export const loadTextsDrafts = async (manifestPath: string) => {
    const manifest = await readProjectManifest(vfs, manifestPath);
    const files = manifest.files.filter(isEligibleTextFile);
    const draftsByFile: Record<string, ModuleCartridge> = {};

    for (const filename of files) {
        await useModuleStore.getState().loadModule(filename);
        const moduleData = useModuleStore.getState().getModule(filename);
        if (!moduleData) throw new Error(`Module '${filename}' did not load.`);
        draftsByFile[filename] = moduleData;
    }

    return { files, draftsByFile };
};

export const syncSavedTextsSession = (
    filename: string,
    saved: ModuleCartridge,
) => {
    const sessionStore = useSessionStore.getState();
    const session = sessionStore.sessions[filename];
    if (session?.isDirty)
        throw new Error(`Cannot sync dirty session '${filename}'.`);
    if (!session) return;
    sessionStore.replaceDraft(filename, saved);
    sessionStore.commitDraft(filename);
};
