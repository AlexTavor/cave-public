import { CommandDefinition } from "../../../lib/terminal";
import { getProjectManifestSuggestions } from "./projectCommandSuggestions";
import { projectDuplicateCommand } from "./projectDuplicateCommand";
import { projectSaveBlueprintCommand } from "./projectSaveCommand";
import { refactorService, workspaceService } from "./projectServices";
import { toModuleCartridge } from "./projectCartridgeAdapter";

type Handler = CommandDefinition["execute"];

const handlers: Record<string, Handler> = {
    "project-create": handleProjectCreate,
    "project-load": handleProjectLoad,
    "project-close": handleProjectClose,
    "project-move": handleProjectMove,
};

export const projectCommands: CommandDefinition[] = [
    {
        name: "project-create",
        description: "Create and load a workspace project manifest.",
        usage: "project-create <path> <name>",
        execute: handlers["project-create"],
        autocomplete: getProjectManifestSuggestions,
    },
    {
        name: "project-load",
        description:
            "Load a project manifest and initialize workspace runtime.",
        usage: "project-load <manifest_path>",
        execute: handlers["project-load"],
        autocomplete: getProjectManifestSuggestions,
    },
    {
        name: "project-close",
        description: "Close active workspace and release runtime state.",
        usage: "project-close",
        execute: handlers["project-close"],
    },
    {
        name: "project-move",
        description: "Move a namespace and update references across modules.",
        usage: "project-move <old_namespace> <new_namespace>",
        execute: handlers["project-move"],
    },
    projectDuplicateCommand,
    projectSaveBlueprintCommand,
];

async function handleProjectCreate(args: string[]) {
    if (args.length < 2)
        return {
            type: "error" as const,
            content: "Usage: project-create <path> <name>",
        };
    try {
        await workspaceService.createProject(
            args[0],
            args.slice(1).join(" "),
        );
        return {
            type: "success" as const,
            content: `Project '${args.slice(1).join(" ")}' created.`,
        };
    } catch (error) {
        return {
            type: "error" as const,
            content:
                error instanceof Error ? error.message : String(error),
        };
    }
}

async function handleProjectLoad(
    args: string[],
    context: Parameters<Handler>[1],
) {
    if (!args[0])
        return {
            type: "error" as const,
            content: "Usage: project-load <manifest_path>",
        };
    try {
        await workspaceService.loadProject(args[0]);
        const cartridge = workspaceService.activeCartridge;
        if (cartridge && context.runtime?.loadCartridge) {
            try {
                context.runtime.loadCartridge(
                    toModuleCartridge(cartridge),
                );
            } catch (error) {
                const details =
                    error instanceof Error
                        ? error.message
                        : JSON.stringify(error);
                return {
                    type: "info" as const,
                    content: `Loaded '${args[0]}', but runtime bootstrap failed: ${details}`,
                };
            }
        }
        context.ui?.openFile?.(args[0]);
        context.ui?.onProjectLoaded?.(args[0]);
        return { type: "success" as const, content: `Loaded '${args[0]}'.` };
    } catch (error) {
        return {
            type: "error" as const,
            content:
                error instanceof Error ? error.message : String(error),
        };
    }
}

async function handleProjectClose(
    _args: string[],
    context: Parameters<Handler>[1],
) {
    await workspaceService.closeProject();
    context.runtime?.unload?.();
    context.ui?.closeWorkspace?.();
    return { type: "success" as const, content: "Project closed." };
}

async function handleProjectMove(args: string[]) {
    if (args.length < 2)
        return {
            type: "error" as const,
            content:
                "Usage: project-move <old_namespace> <new_namespace>",
        };
    try {
        await refactorService.moveNamespace(args[0], args[1]);
        return {
            type: "success" as const,
            content: `Moved '${args[0]}' -> '${args[1]}'.`,
        };
    } catch (error) {
        return {
            type: "error" as const,
            content:
                error instanceof Error ? error.message : String(error),
        };
    }
}
