import * as z from "zod";
import { baseSchema, getSchemaType } from "./schemaIntrospection";

/**
 * Safer shape extraction: unwrap wrappers first, then read `.def.shape` / `.shape` depending on impl.
 */
export function getObjectShape(
    schema: z.ZodType,
): Record<string, z.ZodType> | null {
    const base = baseSchema(schema);
    if (getSchemaType(base) !== "ZodObject" && getSchemaType(base) !== "object")
        return null;

    // v4 classic object exposes `.shape`
    // We also check `_def.shape` as a fallback
    const shape =
        (base as any).shape ??
        (base as any)._def?.shape ??
        (base as any).def?.shape;

    if (!shape) return null;

    // Some builds represent shape as a function returning the shape object.
    if (typeof shape === "function") return shape();
    if (typeof shape === "object") return shape;

    return null;
}
