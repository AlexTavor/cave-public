import { CommandDefinition } from "../../../lib/terminal";
import { loadBootstrapSnapshotFromPublicAsset } from "../../vfs/bootstrap";
import { vfs } from "../../vfs/FileSystem";
import { refreshFileCache } from "../fileUtils";

const SUCCESS_MESSAGE =
    "Bootstrap snapshot loaded into VFS. Existing VFS contents were replaced.";

export const bootstrapLoadCommand: CommandDefinition = {
    name: "bootstrap-load",
    description:
        "Destructively replace the full VFS with /bootstrap/vfs-prod.json.",
    usage: "bootstrap-load",
    execute: async (_args, context) => {
        try {
            const snapshot = await loadBootstrapSnapshotFromPublicAsset();
            await vfs.importState(snapshot);
            refreshFileCache();
            context.ui?.closeWorkspace?.();
            return { type: "success", content: SUCCESS_MESSAGE };
        } catch (error) {
            return {
                type: "error",
                content:
                    error instanceof Error
                        ? `Bootstrap load failed: ${error.message}`
                        : "Bootstrap load failed.",
            };
        }
    },
};
