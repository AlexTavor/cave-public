import * as z from "zod";
import {
    emptyFlags,
    RemovableCatch,
    RemovableDefault,
    RemovablePrefault,
    RemovableReadonly,
    Unwrappable,
    UnwrapResult,
    WrapperFlags,
} from "./schemaTypes";

/**
 * Safely get the schema "type" discriminator.
 * Checks `def.typeName` (Zod standard) or fallback `def.type`.
 */
export function getSchemaType(schema: z.ZodType): string {
    const def = (schema as any)._def || (schema as any).def;
    return def?.typeName ?? def?.type ?? "unknown";
}

/**
 * Removes *one* outer wrapper layer if it's a known wrapper.
 * Returns [nextSchema, didStrip, flagsDelta]
 */
function stripOne(
    schema: z.ZodType,
): [z.ZodType, boolean, Partial<WrapperFlags>] {
    const t = getSchemaType(schema);

    // Many wrappers support `unwrap()` in v4 (optional/nullable/etc.)
    if (typeof (schema as any).unwrap === "function") {
        if (t === "ZodOptional" || t === "optional") {
            return [
                (schema as unknown as Unwrappable).unwrap(),
                true,
                { optional: true },
            ];
        }
        if (t === "ZodNullable" || t === "nullable") {
            return [
                (schema as unknown as Unwrappable).unwrap(),
                true,
                { nullable: true },
            ];
        }
        if (t === "ZodReadonly" || t === "readonly") {
            return [
                (schema as unknown as Unwrappable).unwrap(),
                true,
                { readonly: true },
            ];
        }
        // Fallback for generic unwrappables
        return [
            (schema as unknown as Unwrappable).unwrap(),
            true,
            { unknownWrapper: true },
        ];
    }

    // Default / prefault / catch / readonly have explicit removers in v4
    if (typeof (schema as any).removeDefault === "function") {
        return [
            (schema as unknown as RemovableDefault).removeDefault(),
            true,
            { defaulted: true },
        ];
    }
    if (typeof (schema as any).removePrefault === "function") {
        return [
            (schema as unknown as RemovablePrefault).removePrefault(),
            true,
            { prefaulted: true },
        ];
    }
    if (typeof (schema as any).removeCatch === "function") {
        return [
            (schema as unknown as RemovableCatch).removeCatch(),
            true,
            { caught: true },
        ];
    }
    if (typeof (schema as any).removeReadonly === "function") {
        return [
            (schema as unknown as RemovableReadonly).removeReadonly(),
            true,
            { readonly: true },
        ];
    }

    // Handle ZodEffects (refinements/transforms) by checking for `schema` or `_def.schema`
    // This is often needed to get to the underlying type for UI generation.
    const def = (schema as any)._def;
    if (t === "ZodEffects" && def?.schema) {
        return [def.schema, true, {}];
    }

    return [schema, false, {}];
}

/**
 * Recursively strips wrapper layers (optional/nullable/default/prefault/catch/readonly/etc.)
 * until we reach a non-wrapper schema.
 */
export function unwrapAll<T extends z.ZodType>(schema: T): UnwrapResult<T> {
    let cur: z.ZodType = schema;
    const flags = { ...emptyFlags() };

    // hard stop to prevent infinite loops if a custom schema lies about unwrap/remove
    for (let i = 0; i < 64; i++) {
        const [next, didStrip, delta] = stripOne(cur);
        if (!didStrip) break;
        cur = next;
        flags.optional = delta.optional ?? flags.optional;
        flags.nullable = delta.nullable ?? flags.nullable;
        flags.defaulted = delta.defaulted ?? flags.defaulted;
        flags.prefaulted = delta.prefaulted ?? flags.prefaulted;
        flags.caught = delta.caught ?? flags.caught;
        flags.readonly = delta.readonly ?? flags.readonly;
        if (delta.unknownWrapper) flags.unknownWrapper = true;
    }

    return { base: cur as T, flags };
}

export function unwrapSchema<T extends z.ZodType>(schema: T): z.ZodType {
    return unwrapAll(schema).base;
}

/**
 * Convenience: just return the base schema (no flags).
 */
export function baseSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
    return unwrapAll(schema).base;
}
