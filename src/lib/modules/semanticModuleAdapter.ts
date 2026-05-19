import { BlueprintSchema } from "../../data/schemas/blueprint";
import {
    ModuleCartridgeSchema,
    type ModuleCartridge,
} from "../../data/schemas/module";

const stem = (filename: string) => {
    const normalized = filename.replaceAll("\\", "/");
    const leaf = normalized.split("/").pop() ?? normalized;
    const dot = leaf.lastIndexOf(".");
    return dot > 0 ? leaf.slice(0, dot) : leaf;
};

const withMetadata = (filename: string) => ({
    metadata: {
        id: stem(filename),
        name: stem(filename),
        version: "0.0.1",
    },
    blueprints: {},
    assets: {},
});

export const isBlueprintFile = (filename: string) =>
    filename.toLowerCase().endsWith(".bp");

export const isScriptFile = (filename: string) =>
    filename.toLowerCase().endsWith(".cvs");

export const toBlueprintModule = (
    filename: string,
    raw: unknown,
): ModuleCartridge => {
    if (raw && typeof raw === "object" && !("id" in raw)) {
        const wrapped = (raw as Record<string, unknown>).blueprints;
        const entries = Object.entries(
            (wrapped && typeof wrapped === "object" ? wrapped : raw) as Record<
                string,
                unknown
            >,
        );
        if (entries.length === 0) {
            return ModuleCartridgeSchema.parse(withMetadata(filename));
        }
        const [id, value] = entries[0];
        const blueprint = BlueprintSchema.parse({ id, ...(value as object) });
        return ModuleCartridgeSchema.parse({
            ...withMetadata(filename),
            blueprints: { [blueprint.id]: blueprint },
        });
    }
    const blueprint = BlueprintSchema.parse(raw);
    return ModuleCartridgeSchema.parse({
        ...withMetadata(filename),
        blueprints: { [blueprint.id]: blueprint },
    });
};

export const toScriptModule = (
    filename: string,
    scriptText: string,
): ModuleCartridge => {
    return ModuleCartridgeSchema.parse({
        ...withMetadata(filename),
        scripts: { [filename]: scriptText },
    });
};

export const selectBlueprintForFilename = (
    filename: string,
    moduleData: ModuleCartridge,
) => {
    const candidates = Object.values(moduleData.blueprints ?? {});
    if (candidates.length === 0) {
        throw new Error(`Cannot save '${filename}': no blueprint found.`);
    }
    const matchId = stem(filename);
    return candidates.find((bp) => bp.id === matchId) ?? candidates[0];
};
