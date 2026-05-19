import { vfs } from "../../../../engine/vfs/FileSystem";
import { workspaceService } from "../../../../engine/terminal/commands/projectServices";
import { deepClone } from "../../../../utils/objectUtils";
import { applyLayoutBatch, type PositionUpdate } from "./layoutPersistence";

export const persistProjectLayout = async (
    manifestPath: string,
    updates: PositionUpdate[],
): Promise<void> => {
    const touched = new Set<string>();

    for (const [filename, source] of workspaceService.moduleCache.entries()) {
        const next = deepClone(source);
        if (!applyLayoutBatch(next, filename, updates)) continue;
        await workspaceService.writeModule(filename, next);
        touched.add(filename);
    }

    for (const filename of touched) {
        await vfs.saveToDisk(workspaceService.resolveProjectFile(filename));
    }

    await workspaceService.loadProject(manifestPath);
};
