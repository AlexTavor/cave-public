import * as z from "zod";
import { getZodType } from "./schemaTypeNames";

/**
 * Checks if the schema allows undefined (is Optional).
 */
export function acceptsUndefined(schema: z.ZodType): boolean {
    return schema.safeParse(undefined).success;
}

export function isOptional(schema: z.ZodType): boolean {
    return acceptsUndefined(schema);
}

export function acceptsNull(schema: z.ZodType): boolean {
    return schema.safeParse(null).success;
}

/**
 * Narrowing helpers
 */
export function isObject(schema: z.ZodType): schema is z.ZodObject<any> {
    return getZodType(schema) === "object";
}

export function isArray(schema: z.ZodType): schema is z.ZodArray<any> {
    return getZodType(schema) === "array";
}

export function isEnum(schema: z.ZodType): schema is z.ZodEnum<any> {
    return getZodType(schema) === "enum";
}
