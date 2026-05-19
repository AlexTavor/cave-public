import * as z from "zod";
import type { Blueprint } from "../../../../../data/schemas/blueprint";
import { BlueprintSchema } from "../../../../../data/schemas/blueprint";
import { StateComponentSchema } from "../../../../../data/schemas/components";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { getSchemaType, unwrapSchema } from "../../utils/schemaIntrospection";
import {
    getObjectShape,
    resolveObjectChild,
    resolveRecordChild,
} from "./schemaIntrospection.handlers";

export { getResolvedType } from "./schemaIntrospection.handlers";

interface ParsedPath {
    base: string;
    pathSegments: string[];
    partial: string;
}

const COMPONENT_KEYS = [
    "display",
    "state",
    "assignment",
    "behavior",
    "narrative",
    "physics",
] as const;

export const parsePath = (pathString: string): ParsedPath | null => {
    const trimmed = pathString.trim();
    if (!trimmed.includes(".")) return null;

    const hasTrailingDot = trimmed.endsWith(".");
    const withoutTrailing = hasTrailingDot ? trimmed.slice(0, -1) : trimmed;
    const parts = withoutTrailing.split(".");
    const base = parts[0] ?? "";
    const tail = parts.slice(1);
    const partial = hasTrailingDot ? "" : (tail.at(-1) ?? "");
    const pathSegments = hasTrailingDot ? tail : tail.slice(0, -1);

    return { base, pathSegments, partial };
};

export const filterByPrefix = (values: string[], prefix: string): string[] => {
    if (!prefix) return values;
    const normalized = prefix.toLowerCase();
    return values.filter((value) => value.toLowerCase().startsWith(normalized));
};

export const isBlueprintRootSchema = (schema: z.ZodTypeAny): boolean => {
    const shape = getObjectShape(schema);
    return Boolean(shape?.components && shape?.id && shape?.label);
};

export const isGameValueStructure = (schema: z.ZodTypeAny): boolean => {
    const shape = getObjectShape(schema);
    if (!shape) return false;
    return Boolean(shape.value && shape.max && shape.min);
};

export const getSchemaChildren = (
    schema: z.ZodTypeAny,
    data: unknown,
    includeComponentShortcuts: boolean,
): string[] => {
    const base = unwrapSchema(schema);
    const typeName = getSchemaType(base).toLowerCase();

    if (typeName.includes("record")) {
        if (!data || typeof data !== "object") return [];
        return Object.keys(data as Record<string, unknown>);
    }

    if (!typeName.includes("object")) return [];

    const shape = getObjectShape(base);
    if (!shape) return [];

    const keys = new Set(Object.keys(shape));

    if (includeComponentShortcuts) {
        for (const key of COMPONENT_KEYS) {
            keys.add(key);
        }
    }

    return Array.from(keys);
};

export const resolveRootSchema = (
    moduleData: ModuleCartridge | null,
    draft: Blueprint | null,
    base: string,
): { schema: z.ZodTypeAny; data: unknown; isBlueprintRoot: boolean } | null => {
    if (base === "self") {
        return {
            schema: BlueprintSchema,
            data: draft ?? null,
            isBlueprintRoot: true,
        };
    }

    if (base === "global") {
        const worldState = moduleData?.blueprints?.sys_world?.components?.state;
        return {
            schema: StateComponentSchema,
            data: worldState ?? null,
            isBlueprintRoot: false,
        };
    }

    const blueprint = moduleData?.blueprints?.[base];
    if (blueprint) {
        return {
            schema: BlueprintSchema,
            data: blueprint,
            isBlueprintRoot: true,
        };
    }

    return null;
};

export const resolveChild = (
    schema: z.ZodTypeAny,
    data: unknown,
    segment: string,
    isBlueprintRoot: boolean,
): { schema: z.ZodTypeAny; data: unknown; isBlueprintRoot: boolean } | null => {
    const base = unwrapSchema(schema);
    const typeName = getSchemaType(base).toLowerCase();

    if (typeName.includes("record")) {
        return resolveRecordChild(base, data, segment);
    }

    if (!typeName.includes("object")) return null;

    return resolveObjectChild(base, data, segment, isBlueprintRoot);
};

