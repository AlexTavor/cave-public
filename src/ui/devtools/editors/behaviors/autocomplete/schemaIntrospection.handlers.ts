import * as z from "zod";
import { getSchemaType, unwrapSchema } from "../../utils/schemaIntrospection";
import type { ResolvedType } from "./schemaIntrospection.types";

export type ZodTypeName = string;

export const getObjectShape = (
    schema: z.ZodTypeAny,
): Record<string, z.ZodTypeAny> | null => {
    const base = unwrapSchema(schema);
    const typeName = getSchemaType(base).toLowerCase();
    if (!typeName.includes("object")) return null;
    const def = (base as any)._def;
    const shape = typeof def?.shape === "function" ? def.shape() : def?.shape;
    return shape ?? null;
};

export const getRecordValueSchema = (
    schema: z.ZodTypeAny,
): z.ZodTypeAny | null => {
    const base = unwrapSchema(schema);
    const typeName = getSchemaType(base).toLowerCase();
    if (!typeName.includes("record")) return null;
    const def = (base as any)._def;
    return def?.valueType ?? def?.value ?? null;
};

// Per-type handler functions

function handleNumber(): ResolvedType {
    return "number";
}

function handleString(): ResolvedType {
    return "string";
}

function handleBoolean(): ResolvedType {
    return "boolean";
}

function handleEnum(): ResolvedType {
    return "string";
}

function handleLiteral(schema: z.ZodTypeAny): ResolvedType {
    const def = (schema as any)._def;
    if (typeof def?.value === "number") return "number";
    if (typeof def?.value === "boolean") return "boolean";
    if (typeof def?.value === "string") return "string";
    return "unknown";
}

function handleObject(): ResolvedType {
    return "object";
}

function handleUnion(schema: z.ZodTypeAny): ResolvedType {
    const def = (schema as any)._def;
    const options = Array.isArray(def?.options) ? def.options : [];
    const optionTypes = options
        .map((option: z.ZodTypeAny) => getResolvedType(option))
        .filter((type: ResolvedType) => type !== "unknown");
    if (optionTypes.length === 0) return "unknown";
    const unique = new Set(optionTypes);
    return unique.size === 1 ? optionTypes[0] : "unknown";
}

export const resolvedTypeHandlers: Partial<
    Record<ZodTypeName, (schema: z.ZodTypeAny) => ResolvedType>
> = {
    // Zod v3 names
    ZodNumber: handleNumber,
    ZodString: handleString,
    ZodBoolean: handleBoolean,
    ZodEnum: handleEnum,
    ZodNativeEnum: handleEnum,
    ZodLiteral: handleLiteral,
    ZodObject: handleObject,
    ZodRecord: handleObject,
    ZodUnion: handleUnion,
    ZodDiscriminatedUnion: handleUnion,
    // Zod v4 lowercase names
    number: handleNumber,
    string: handleString,
    boolean: handleBoolean,
    enum: handleEnum,
    literal: handleLiteral,
    object: handleObject,
    record: handleObject,
    union: handleUnion,
    discriminatedUnion: handleUnion,
};

// Defined here (not in utils) to avoid a circular dependency:
// handleUnion calls getResolvedType recursively.
export const getResolvedType = (schema: z.ZodTypeAny): ResolvedType => {
    const base = unwrapSchema(schema);
    const typeName = getSchemaType(base);

    const handler = resolvedTypeHandlers[typeName];
    if (handler) return handler(base);

    // Fallback: includes-based matching for unrecognised / mixed v3-v4 names
    const lowerType = typeName.toLowerCase();
    if (lowerType.includes("number")) return "number";
    if (lowerType.includes("string")) return "string";
    if (lowerType.includes("boolean")) return "boolean";
    if (lowerType.includes("enum")) return "string";
    if (lowerType.includes("literal")) return handleLiteral(base);
    if (lowerType.includes("object") || lowerType.includes("record"))
        return "object";
    if (lowerType.includes("union")) return handleUnion(base);

    return "unknown";
};

export const resolveRecordChild = (
    schema: z.ZodTypeAny,
    data: unknown,
    segment: string,
): { schema: z.ZodTypeAny; data: unknown; isBlueprintRoot: boolean } | null => {
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    if (!Object.hasOwn(record, segment)) return null;
    const valueSchema = getRecordValueSchema(schema);
    if (!valueSchema) return null;
    return {
        schema: valueSchema,
        data: record[segment],
        isBlueprintRoot: false,
    };
};

const COMPONENT_KEYS = [
    "display",
    "state",
    "assignment",
    "behavior",
    "narrative",
    "physics",
] as const;

export const resolveObjectChild = (
    schema: z.ZodTypeAny,
    data: unknown,
    segment: string,
    isBlueprintRoot: boolean,
): { schema: z.ZodTypeAny; data: unknown; isBlueprintRoot: boolean } | null => {
    const shape = getObjectShape(schema);
    if (!shape) return null;

    if (isBlueprintRoot && COMPONENT_KEYS.includes(segment as any)) {
        const componentsSchema = shape.components;
        const componentsShape = componentsSchema
            ? getObjectShape(componentsSchema)
            : null;
        const componentSchema = componentsShape?.[segment];
        if (!componentSchema) return null;
        return {
            schema: componentSchema,
            data: (data as any)?.components?.[segment],
            isBlueprintRoot: false,
        };
    }

    const childSchema = shape[segment];
    if (!childSchema) return null;

    return {
        schema: childSchema,
        data: (data as any)?.[segment],
        isBlueprintRoot: false,
    };
};
