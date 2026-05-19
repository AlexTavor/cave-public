import { CommandDefinition } from "../../../lib/terminal";
import { ModuleSerializer } from "../../linker/ModuleSerializer";
import { gatekeeper, workspaceService } from "./projectServices";
import { stageProjectVersionInVfs } from "../../workspace/projectVersionPersistence";
import { vfs } from "../../vfs/FileSystem";

const toNamespace = (filename: string) => filename.replace(/\.[^/.]+$/, "");

const locate = (fqId: string) => {
    for (const [filename, mod] of workspaceService.moduleCache.entries()) {
        const namespace = toNamespace(filename);
        for (const [key, bp] of Object.entries(mod.blueprints ?? {})) {
            const resolved = key.includes("::") ? key : `${namespace}::${key}`;
            if (resolved === fqId || bp.id === fqId)
                return { filename, key, bp };
        }
    }
    return null;
};

export const projectSaveBlueprintCommand: CommandDefinition = {
    name: "project-save-blueprint",
    description:
        "Serialize and save one blueprint through gatekeeper validation.",
    usage: "project-save-blueprint <fq_id>",
    execute: async (args) => {
        const fqId = args[0];
        if (!fqId)
            return {
                type: "error",
                content: "Usage: project-save-blueprint <fq_id>",
            };
        const located = locate(fqId);
        if (!located)
            return { type: "error", content: `Blueprint '${fqId}' not found.` };

        const source = workspaceService.moduleCache.get(located.filename);
        if (!source)
            return {
                type: "error",
                content: `Module '${located.filename}' missing.`,
            };

        const nextBlueprint = ModuleSerializer.serializeBlueprint(
            located.bp as any,
            {
                targetNamespace: toNamespace(located.filename),
            },
        );
        const payload = {
            ...source,
            blueprints: {
                ...source.blueprints,
                [located.key]: nextBlueprint as any,
            },
        };

        try {
            await gatekeeper.validatePayload(
                Object.fromEntries(workspaceService.moduleCache.entries()),
                located.filename,
                payload,
            );
            await workspaceService.writeModule(
                located.filename,
                payload as any,
            );
            const manifestPath = workspaceService.getManifestPath();
            if (manifestPath) {
                await stageProjectVersionInVfs(vfs, manifestPath, "patch");
            }
            return { type: "success", content: `Saved blueprint '${fqId}'.` };
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            return { type: "error", content: `Validation failed: ${message}` };
        }
    },
};

