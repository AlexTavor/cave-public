import * as z from "zod";
import { getZodType } from "./schemaTypeNames";
import { unwrapSchema } from "./schemaIntrospection";

/**
 * Generates a sensible default value for a given schema.
 * Used when adding new items to arrays or new properties to objects.
 */
export function getDefaultValue(schema: z.ZodTypeAny): any {
    // 1. Try Zod's internal default (via safeParse of undefined)
    const result = schema.safeParse(undefined);
    // Ignore 'undefined' success results (e.g. from .optional()) so we generate a concrete base value
    if (result.success && result.data !== undefined) return result.data;

    // 2. Fallback based on base type
    const base = unwrapSchema(schema);
    const type = getZodType(base);

    switch (type) {
        case "string":
            return "";
        case "number":
            return 0;
        case "boolean":
            return false;
        case "array":
            return [];
        case "object":
            return {};
        case "enum": {
            // Try to grab the first enum value
            const def = (base as any)._def || (base as any).def;
            if (def.values && Array.isArray(def.values)) return def.values[0]; // ZodEnum
            if (def.typeName === "ZodNativeEnum" && def.values)
                return Object.values(def.values)[0]; // ZodNativeEnum
            return "";
        }
        case "unknown":
            // Provide null for unknown types (like 'compiled') so they materialize in the object
            // instead of staying undefined.
            return null;
    }

    return undefined;
}
