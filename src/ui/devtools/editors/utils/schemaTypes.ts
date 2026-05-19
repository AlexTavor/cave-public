import * as z from "zod";

/**
 * Common “wrapper” capabilities in Zod v4 classic API.
 * We intentionally duck-type these so we don't depend on specific wrapper classes.
 */
export type Unwrappable = { unwrap: () => z.ZodType };
export type RemovableDefault = { removeDefault: () => z.ZodType };
export type RemovablePrefault = { removePrefault: () => z.ZodType };
export type RemovableCatch = { removeCatch: () => z.ZodType };
export type RemovableReadonly = { removeReadonly: () => z.ZodType };

export type WrapperFlags = Readonly<{
    optional: boolean;
    nullable: boolean;
    defaulted: boolean;
    prefaulted: boolean;
    caught: boolean;
    readonly: boolean;
    /** encountered a wrapper we didn't explicitly know how to strip */
    unknownWrapper: boolean;
}>;

export type UnwrapResult<T extends z.ZodType = z.ZodType> = Readonly<{
    base: T;
    flags: WrapperFlags;
}>;

export const emptyFlags = (): WrapperFlags => ({
    optional: false,
    nullable: false,
    defaulted: false,
    prefaulted: false,
    caught: false,
    readonly: false,
    unknownWrapper: false,
});

/**
 * Generic helper to get (Input/Output) TS types from a schema.
 */
export type InputOf<S extends z.ZodType> = z.input<S>;
export type OutputOf<S extends z.ZodType> = z.output<S>;
