import { CommandDefinition } from "../../../lib/terminal";
import { readProjectManifest } from "../../workspace/projectManifest";
import { vfs } from "../../vfs/FileSystem";
import { getProjectRootSuggestions } from "./projectCommandSuggestions";

const cloneData = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const normalizeRoot = (value: string) =>
    value.replace(/\/manifest\.json$/, "").replace(/\/+$/, "");

const maybeRenameModule = (
    mod: any,
    oldName: string,
    newName: string,
    newId: string,
) => {
    if (!mod?.metadata || typeof mod.metadata !== "object") return mod;
    if (mod.metadata.name === oldName) mod.metadata.name = newName;
    if (
        mod.metadata.id === oldName ||
        mod.metadata.id === normalizeRoot(oldName)
    ) {
        mod.metadata.id = newId;
    }
    return mod;
};

export const projectDuplicateCommand: CommandDefinition = {
    name: "project-duplicate",
    description: "Clone a project folder and update project naming metadata.",
    usage: "project-duplicate <existing_project> <new_project_name>",
    execute: async (args) => {
        if (args.length < 2) {
            return {
                type: "error",
                content:
                    "Usage: project-duplicate <existing_project> <new_project_name>",
            };
        }
        const sourceRoot = normalizeRoot(args[0]);
        const newName = args.slice(1).join(" ").trim();
        if (!newName)
            return { type: "error", content: "New project name is required." };
        const targetRoot = newName;

        try {
            const manifest = await readProjectManifest(
                vfs,
                `${sourceRoot}/manifest.json`,
            );
            if (await vfs.readFile(`${targetRoot}/manifest.json`)) {
                return {
                    type: "error",
                    content: `Project '${targetRoot}' already exists.`,
                };
            }

            const nextManifest = { ...manifest, name: newName };
            await vfs.writeFile(
                `${targetRoot}/manifest.json`,
                nextManifest as unknown as any,
            );

            for (const file of manifest.files) {
                const mod = await vfs.readFile(`${sourceRoot}/${file}`);
                if (!mod)
                    throw new Error(`Missing module '${sourceRoot}/${file}'.`);
                const cloned = maybeRenameModule(
                    cloneData(mod),
                    manifest.name,
                    newName,
                    targetRoot,
                );
                await vfs.writeFile(`${targetRoot}/${file}`, cloned);
            }

            return {
                type: "success",
                content: `Duplicated '${sourceRoot}' as '${targetRoot}'.`,
            };
        } catch (error) {
            return {
                type: "error",
                content: error instanceof Error ? error.message : String(error),
            };
        }
    },
    autocomplete: getProjectRootSuggestions,
};
