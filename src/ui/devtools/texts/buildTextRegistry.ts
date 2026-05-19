import type { ModuleCartridge } from "../../../data/schemas/module";
import { buildBlueprintTextBlocks } from "./buildTextRegistry.bp";
import { buildCaveTextBlocks } from "./buildTextRegistry.cave";
import { buildDraftTextBlocks } from "./buildTextRegistry.draft";
import type { TextOwnerBlock } from "./types";

const getKind = (filename: string) => {
    if (filename.endsWith(".bp")) return "bp";
    if (filename.endsWith(".draft")) return "draft";
    if (filename.endsWith(".cave")) return "cave";
    return null;
};

export const buildTextRegistry = (
    draftsByFile: Record<string, ModuleCartridge>,
    files: string[],
): TextOwnerBlock[] =>
    files.flatMap((filename) => {
        const moduleData = draftsByFile[filename];
        if (!moduleData) return [];
        switch (getKind(filename)) {
            case "bp":
                return buildBlueprintTextBlocks(filename, moduleData);
            case "draft":
                return buildDraftTextBlocks(filename, moduleData);
            case "cave":
                return buildCaveTextBlocks(filename, moduleData);
            default:
                return [];
        }
    });
