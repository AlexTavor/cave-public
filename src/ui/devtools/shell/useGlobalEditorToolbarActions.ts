import { useCallback, useState } from "react";
import { vfs } from "../../../engine/vfs/FileSystem";
import { runProjectSaveHandlers } from "../project/projectSaveRegistry";
import { workspaceService } from "../../../engine/terminal/commands/projectServices";
import { toModuleCartridge } from "../../../engine/terminal/commands/projectCartridgeAdapter";
import { useRuntimeStore } from "../../runtime/state/useRuntimeStore";
import { resolveCompileManifestPath } from "./resolveCompileManifestPath";
import { useBootstrapExportAction } from "./useBootstrapExportAction";
import { isExportableVfsFile } from "./exportableVfsFiles";
import {
    clearStagedProjectVersion,
    getStagedProjectVersion,
} from "../../../engine/workspace/projectVersionTracker";

type LogType = "input" | "output" | "error" | "info" | "success";
type PushType = "success" | "error" | "info";

interface Params {
    moduleFilename: string | null;
    activeFilePath: string | null;
    save: () => Promise<unknown>;
    log: (type: LogType, content: string) => void;
    pushToast: (type: PushType, content: string) => void;
}
const listExportableDirtyFiles = async () => {
    const files =
        typeof vfs.getDirtyFiles === "function"
            ? vfs.getDirtyFiles()
            : await vfs.listFiles();
    return files.filter(isExportableVfsFile);
};

export const useGlobalEditorToolbarActions = ({
    moduleFilename,
    activeFilePath,
    save,
    log,
    pushToast,
}: Params) => {
    const loadCartridge = useRuntimeStore((s) => s.loadCartridge);
    const [isSaving, setIsSaving] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const { isExportingBootstrap, handleExportBootstrap } =
        useBootstrapExportAction({ log, pushToast });

    const handleSave = useCallback(async () => {
        try {
            setIsSaving(true);
            if (moduleFilename) await save();
            const local = await runProjectSaveHandlers();
            const files = await listExportableDirtyFiles();
            const manifestPath = workspaceService.getManifestPath();
            let diskSaved = 0;
            let manifestSaved = !manifestPath;
            for (const file of files) {
                try {
                    await vfs.saveToDisk(file);
                    diskSaved += 1;
                    if (file === manifestPath) manifestSaved = true;
                } catch {
                    // Best effort save.
                }
            }
            if (manifestPath && local.failed === 0 && manifestSaved) {
                if (getStagedProjectVersion(manifestPath)) {
                    clearStagedProjectVersion(manifestPath);
                }
            }
            const msg = `Project save: ${local.success}/${local.total} editors, ${diskSaved}/${files.length} files.`;
            pushToast(local.failed > 0 ? "info" : "success", msg);
            log(local.failed > 0 ? "info" : "success", msg);
        } catch (error: unknown) {
            const msg =
                error instanceof Error ? error.message : "Project save failed.";
            pushToast("error", msg);
            log("error", msg);
        } finally {
            setIsSaving(false);
        }
    }, [log, moduleFilename, pushToast, save]);

    const handleCompile = useCallback(async () => {
        try {
            setIsCompiling(true);
            await handleSave();
            const manifestPath = await resolveCompileManifestPath({
                activeModuleFilename: moduleFilename,
                activeFilePath,
                workspaceManifestPath: workspaceService.getManifestPath(),
            });
            if (!manifestPath)
                throw new Error(
                    "No project manifest found. Open or load a project manifest first.",
                );
            await workspaceService.loadProject(manifestPath);
            const linked = workspaceService.activeCartridge;
            if (!linked)
                throw new Error("Compile failed: no linked runtime cartridge.");
            loadCartridge(toModuleCartridge(linked));
            const msg =
                "Compile successful. Runtime module refreshed from current project.";
            pushToast("success", msg);
            log("success", msg);
        } catch (error: unknown) {
            const msg =
                error instanceof Error ? error.message : "Compile failed.";
            pushToast("error", msg);
            log("error", msg);
        } finally {
            setIsCompiling(false);
        }
    }, [handleSave, loadCartridge, log, pushToast]);

    return {
        isSaving,
        isCompiling,
        isExportingBootstrap,
        handleSave,
        handleCompile,
        handleExportBootstrap,
    };
};

