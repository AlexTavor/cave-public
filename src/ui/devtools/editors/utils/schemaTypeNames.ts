import * as z from "zod";
import { getSchemaType, unwrapSchema } from "./schemaIntrospection";

/**
 * Returns the simplified type name expected by SchemaField.
 * e.g. "string", "number", "array", "object", "enum"
 */
export function getZodType(schema: z.ZodTypeAny): string {
    const base = unwrapSchema(schema);
    const typeName = getSchemaType(base);

    const directMap: Record<string, string> = {
        ZodString: "string",
        ZodNumber: "number",
        ZodBoolean: "boolean",
        ZodArray: "array",
        ZodObject: "object",
        ZodRecord: "record",
        ZodUnion: "union",
        ZodEnum: "enum",
        ZodNativeEnum: "enum",
        ZodUnknown: "unknown",
        ZodAny: "unknown",
    };

    if (directMap[typeName]) return directMap[typeName];

    // Fallback for environment variations or older Zod versions
    const lower = typeName.toLowerCase();
    const fuzzyMap: Array<[string, string]> = [
        ["string", "string"],
        ["number", "number"],
        ["boolean", "boolean"],
        ["array", "array"],
        ["object", "object"],
        ["record", "record"],
        ["union", "union"],
        ["enum", "enum"],
    ];

    const fuzzyMatch = fuzzyMap.find(([needle]) => lower.includes(needle));
    if (fuzzyMatch) return fuzzyMatch[1];

    return typeName;
}
