import type { Blueprint } from "../../../../../data/schemas/blueprint";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { resolvePath } from "./schemaIntrospection";

export const getEntityRefs = (moduleData: ModuleCartridge | null): string[] => {
    const entityIds = Object.keys(moduleData?.blueprints ?? {});
    return ["self", "global", ...entityIds];
};

export const getReferenceNode = (
    token: string,
    moduleData: ModuleCartridge | null,
    draft: Blueprint | null,
): ReturnType<typeof resolvePath> | null => {
    if (!token) return null;
    const node = resolvePath(moduleData, draft, token);
    if (
        node.type === "unknown" &&
        (!node.children || node.children.length === 0)
    ) {
        return null;
    }
    return node;
};
