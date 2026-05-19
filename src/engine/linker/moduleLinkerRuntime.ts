import type { Blueprint } from "../../data/schemas/blueprint";
import { DEFAULT_BLUEPRINT_CONFIG } from "../../data/schemas/blueprintConfig";
import { SysConfigSchema } from "../../data/schemas/v2/config";
import { CompilerService } from "../compiler/CompilerService";
import { deepMergeObjects } from "./deepMerge";
import { namespaceBlueprints } from "./linkerUtils";
import { mergeRegistry } from "./registryMerge";
import type { SemanticFragment } from "./semanticParser";
import type { RuntimeCartridge } from "./types";

export const createRuntimeCartridge = (rootPath: string): RuntimeCartridge => ({
    metadata: { id: rootPath, version: "0.0.1" },
    blueprints: {},
    draft: { draftOptions: {}, draftPools: {} },
    assets: { styles: {}, glyphs: {}, displays: {}, settings: {} },
    config: SysConfigSchema.parse({}),
    blueprint: DEFAULT_BLUEPRINT_CONFIG,
});

export const mergeSemanticFragment = (
    runtime: RuntimeCartridge,
    fragment: SemanticFragment,
    namespace: string,
    path: string,
    debug: (message: string) => void,
) => {
    if (fragment.kind === "cave") {
        runtime.config = deepMergeObjects(runtime.config, fragment.data);
        return;
    }
    if (fragment.kind === "draft") {
        runtime.draft = deepMergeObjects(runtime.draft, fragment.data);
        return;
    }
    if (fragment.kind === "art") {
        runtime.assets = deepMergeObjects(runtime.assets, fragment.data);
        return;
    }
    runtime.blueprints = mergeRegistry(
        runtime.blueprints,
        namespaceBlueprints(fragment.data, namespace, path),
        (id) => debug(`[Linker] Blueprint override: ${id}`),
    );
};

export const compileRuntimeBlueprints = (runtime: RuntimeCartridge) => {
    const compiler = new CompilerService();
    for (const [id, blueprint] of Object.entries(runtime.blueprints)) {
        runtime.blueprints[id] = compiler.compile(
            blueprint as unknown as Blueprint,
        ) as unknown as (typeof runtime.blueprints)[string];
    }
};
