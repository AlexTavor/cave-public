import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { ModuleCartridge } from "../../../data/schemas/module";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";
import { CommandDefinition } from "../../../lib/terminal";
import { vfs } from "../../vfs/FileSystem";
import { createProjectManifest } from "../../workspace/projectManifest";
import {
    DIR_MARKER_FILENAME,
    getPathSuggestions,
    refreshFileCache,
} from "../fileUtils";

const normalize = (value: string) => {
    let path = value.split("\\").join("/");
    while (path.startsWith("/")) path = path.slice(1);
    while (path.endsWith("/")) path = path.slice(0, -1);
    return path;
};
const buildModule = (id: string): ModuleCartridge => ({
    metadata: {
        id,
        name: "New Module",
        version: "0.0.1",
        description: "Created via terminal.",
    },
    blueprints: {},
    config: {
        traits: {},
        habiti: {},
        understanding: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
        },
    },
    assets: {
        displays: {},
        styles: {},
        settings: { vein_network: DEFAULT_VEIN_CONFIG },
    },
});
const buildSemanticTemplate = (
    path: string,
): Record<string, unknown> | string | null => {
    if (path.endsWith("manifest.json")) return createProjectManifest("Project");
    if (path.endsWith(".bp")) {
        const id = path.split("/").pop()?.replace(".bp", "") ?? "";
        return { id, label: "", tags: [], components: {}, _editor: {} };
    }
    if (path.endsWith(".cave"))
        return {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
        };
    if (path.endsWith(".draft")) return { draftOptions: {}, draftPools: {} };
    if (path.endsWith(".art"))
        return {
            displays: {},
            styles: {},
            settings: { vein_network: DEFAULT_VEIN_CONFIG },
        };
    if (path.endsWith(".cvs")) return "# Cave script\n";
    return null;
};

type Handler = CommandDefinition["execute"];

const handlers: Record<string, Handler> = {
    makefile: handleMakeFile,
    makedir: handleMakeDir,
};

const makeFile: CommandDefinition = {
    name: "makefile",
    description: "Create a semantic content file and fail on duplicates.",
    usage: "makefile <path> (aliases: makeFile, vfs.makeFile)",
    execute: handlers["makefile"],
    autocomplete: (args) =>
        args.length === 1 ? getPathSuggestions(args[0] ?? "", false) : [],
};
const makeDir: CommandDefinition = {
    name: "makedir",
    description: "Create a directory marker and fail on duplicate names.",
    usage: "makedir <path> (aliases: makeDir, vfs.makeDir)",
    execute: handlers["makedir"],
    autocomplete: (args) =>
        args.length === 1 ? getPathSuggestions(args[0] ?? "", false) : [],
};

export const makeCommands: CommandDefinition[] = [makeFile, makeDir];

async function handleMakeFile(args: string[]) {
    const raw = args[0];
    if (!raw) return { type: "error" as const, content: "Usage: makeFile <path>" };
    const path = normalize(raw);
    const existing = await vfs.readFile(path);
    if (existing)
        return { type: "error" as const, content: `File '${path}' already exists.` };
    const template = buildSemanticTemplate(path);
    if (!template)
        return {
            type: "error" as const,
            content:
                "Unsupported file type. Use .bp, .cave, .draft, .art, .cvs, or manifest.json.",
        };
    await vfs.writeFile(path, template as ModuleCartridge);
    refreshFileCache();
    return { type: "success" as const, content: `Created file '${path}'` };
}

async function handleMakeDir(args: string[]) {
    const raw = args[0];
    if (!raw) return { type: "error" as const, content: "Usage: makeDir <path>" };
    const dir = normalize(raw);
    if (!dir)
        return {
            type: "error" as const,
            content: "Directory path cannot be empty.",
        };
    const files = await vfs.listFiles();
    const marker = `${dir}/${DIR_MARKER_FILENAME}`;
    const duplicate = files.some(
        (file) =>
            file === dir || file === marker || file.startsWith(`${dir}/`),
    );
    if (duplicate)
        return { type: "error" as const, content: `Path '${dir}' already exists.` };
    await vfs.writeFile(marker, buildModule(marker));
    refreshFileCache();
    return { type: "success" as const, content: `Created directory '${dir}'` };
}

