import type { Blueprint } from "../../../../../data/schemas/blueprint";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import type { SchemaNode } from "./schemaIntrospection.types";
import {
    filterByPrefix,
    getResolvedType,
    getSchemaChildren,
    isBlueprintRootSchema,
    isGameValueStructure,
    parsePath,
    resolveChild,
    resolveRootSchema,
} from "./schemaIntrospection.utils";

export type { ResolvedType, SchemaNode } from "./schemaIntrospection.types";

export const resolvePath = (
    moduleData: ModuleCartridge | null,
    draft: Blueprint | null,
    path: string,
): SchemaNode => {
    const trimmed = path.trim();
    if (!trimmed) return { type: "unknown" };

    const segments = trimmed.split(".").filter(Boolean);
    const base = segments[0];
    if (!base) return { type: "unknown" };

    const root = resolveRootSchema(moduleData, draft, base);
    if (!root) return { type: "unknown" };

    let currentSchema = root.schema;
    let currentData = root.data;
    let isBlueprintRoot = root.isBlueprintRoot;

    for (const segment of segments.slice(1)) {
        const next = resolveChild(
            currentSchema,
            currentData,
            segment,
            isBlueprintRoot,
        );
        if (!next) return { type: "unknown" };
        currentSchema = next.schema;
        currentData = next.data;
        isBlueprintRoot = next.isBlueprintRoot;
    }

    if (isGameValueStructure(currentSchema)) {
        return { type: "number", children: ["value", "max", "min"] };
    }

    const type = getResolvedType(currentSchema);
    if (type !== "object") {
        return { type };
    }

    const includeComponentShortcuts = isBlueprintRootSchema(currentSchema);
    const children = getSchemaChildren(
        currentSchema,
        currentData,
        includeComponentShortcuts,
    );

    return children.length > 0 ? { type, children } : { type };
};

export const resolvePathSuggestions = (
    moduleData: ModuleCartridge | null,
    draft: Blueprint | null,
    pathString: string,
): string[] => {
    const parsed = parsePath(pathString);
    if (!parsed) return [];

    const { base, pathSegments, partial } = parsed;
    if (!base) return [];

    const resolvedPath = [base, ...pathSegments].join(".");
    const node = resolvePath(moduleData, draft, resolvedPath);
    const children = node.children ?? [];
    return filterByPrefix(children, partial);
};
