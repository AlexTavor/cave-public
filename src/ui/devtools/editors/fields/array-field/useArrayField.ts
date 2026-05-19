import { useState, useCallback } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useSchemaFormContext } from "../../SchemaFormContext";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { getDefaultValue, unwrapSchema, getZodType } from "../../utils";
import * as z from "zod";

type ZodDefLike = Readonly<{
    element?: unknown;
    type?: unknown;
}>;

type ZodWithDefs = Readonly<{
    _def?: unknown;
    def?: unknown;
}>;

type ZodWithElement = Readonly<{
    element?: unknown;
}>;

const isObjectRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

const isZodTypeAny = (v: unknown): v is z.ZodTypeAny =>
    isObjectRecord(v) &&
    "safeParse" in v &&
    typeof (v as { safeParse?: unknown }).safeParse === "function";

const getArrayItemSchema = (schema: z.ZodType): z.ZodTypeAny => {
    const base = unwrapSchema(schema);

    // Prefer the public `.element` when present
    const directElement = (base as unknown as ZodWithElement).element;
    if (isZodTypeAny(directElement)) return directElement;

    // Fallback to def-based shapes (still typed safely as unknown)
    const defs = base as unknown as ZodWithDefs;
    const rawDef = defs._def ?? defs.def;

    if (isObjectRecord(rawDef)) {
        const def = rawDef as unknown as ZodDefLike;
        const candidate = def.element ?? def.type;
        if (isZodTypeAny(candidate)) return candidate;
    }

    throw new Error("Array schema is missing an element schema");
};

export interface UseArrayFieldResult {
    items: unknown[];
    isOpen: boolean;
    toggle: () => void;
    add: () => void;
    remove: (index: number) => void;
    itemSchema: z.ZodTypeAny;
}

export const useArrayField = (
    filename: string,
    path: string,
    schema: z.ZodType,
): UseArrayFieldResult => {
    const { expansionState, onSetExpanded } = useSchemaFormContext();
    const updateDraft = useSessionStore((state) => state.updateDraft);

    const items = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return [];
                const val = getByPath(session.draft, path);
                return Array.isArray(val) ? (val as unknown[]) : [];
            },
            [filename, path],
        ),
    );

    const realSchema = unwrapSchema(schema);

    if (getZodType(realSchema) !== "array") {
        throw new Error(`useArrayField expected array schema at "${path}"`);
    }

    const itemSchema = getArrayItemSchema(realSchema);

    const description = schema.description;
    const shouldStartClosed = description?.includes("ui:collapsed") ?? false;
    const expansionKey = path === "" ? "root" : path;

    const [localIsOpen, setLocalIsOpen] = useState<boolean>(!shouldStartClosed);

    const isControlled = expansionState !== undefined;
    const isOpen = isControlled
        ? (expansionState[expansionKey] ?? !shouldStartClosed)
        : localIsOpen;

    const toggle = (): void => {
        if (isControlled && onSetExpanded) {
            onSetExpanded(expansionKey, !isOpen);
            return;
        }
        setLocalIsOpen((prev) => !prev);
    };

    const add = (): void => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, path);

            const nextItem = getDefaultValue(itemSchema) as unknown;

            if (Array.isArray(current)) {
                (current as unknown[]).push(nextItem);
                return;
            }

            setByPath(draft, path, [nextItem]);
        });
    };

    const remove = (index: number): void => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, path);
            if (!Array.isArray(current)) return;

            (current as unknown[]).splice(index, 1);
        });
    };

    return {
        items,
        isOpen,
        toggle,
        add,
        remove,
        itemSchema,
    };
};
