import { ModuleCartridge } from "../../../data/schemas/module";
import { vfs } from "../../../engine/vfs/FileSystem";
import { bumpVersion } from "./versionUtils";

/**
 * Saves a module to the VFS with an automatic version bump.
 * Returns the updated module data.
 */
export const saveModuleWithVersionBump = async (
    filename: string,
    moduleData: ModuleCartridge,
): Promise<ModuleCartridge> => {
    const currentVersion = moduleData.metadata.version || "0.0.0";
    const newVersion = bumpVersion(currentVersion);

    const updatedModule: ModuleCartridge = {
        ...moduleData,
        metadata: {
            ...moduleData.metadata,
            version: newVersion,
        },
    };

    await vfs.writeFile(filename, updatedModule);

    if (import.meta.env.MODE !== "test") {
        try {
            await vfs.saveToDisk(filename);
        } catch (error) {
            console.error(`[VFS] Failed to sync '${filename}' to disk:`, error);
        }
    }
    return updatedModule;
};
