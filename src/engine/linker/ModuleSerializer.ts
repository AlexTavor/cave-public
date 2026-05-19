import { deepClone } from "../../utils/objectUtils";
import type { BlueprintV2 } from "./types";

export interface SerializationContext {
    targetNamespace: string;
}

const FQ_ID = /^(.+)::(.+)$/;

const stripNamespace = (value: string, targetNamespace: string): string => {
    const match = FQ_ID.exec(value);
    if (!match) return value;
    return match[1] === targetNamespace ? match[2] : value;
};

const visit = (node: unknown, targetNamespace: string): unknown => {
    if (typeof node === "string") return stripNamespace(node, targetNamespace);
    if (Array.isArray(node))
        return node.map((item) => visit(item, targetNamespace));
    if (!node || typeof node !== "object") return node;

    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
        node as Record<string, unknown>,
    )) {
        if (key === "_computed") continue;
        next[key] = visit(value, targetNamespace);
    }
    return next;
};

export class ModuleSerializer {
    static serializeBlueprint(
        blueprint: BlueprintV2,
        context: SerializationContext,
    ): unknown {
        const clone = deepClone(blueprint);
        return visit(clone, context.targetNamespace);
    }
}
