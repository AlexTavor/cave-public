import { useState, useCallback } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSchemaFormContext } from "../../SchemaFormContext";
import { unwrapSchema } from "../../utils";
import { ZodType } from "zod";

const EMPTY_OBJECT: Record<string, unknown> = {};

export const useObjectField = (
    filename: string,
    path: string,
    schema: ZodType,
) => {
    const { expansionState, onSetExpanded } = useSchemaFormContext();

    const data = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                return getByPath(session?.draft, path) ?? EMPTY_OBJECT;
            },
            [filename, path],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);

    const realSchema = unwrapSchema(schema);
    const def = (realSchema as any)._def || (realSchema as any).def;
    const shape = (realSchema as any).shape || def?.shape?.() || def?.shape;
    const description = schema.description;

    const fieldCount = shape ? Object.keys(shape).length : 0;
    const isCollapsible =
        description?.includes("ui:collapsed") || fieldCount >= 2;

    const shouldStartClosed = description?.includes("ui:collapsed");

    const expansionKey = path === "" ? "root" : path;
    const [localIsOpen, setLocalIsOpen] = useState(!shouldStartClosed);

    const isControlled = expansionState !== undefined;

    const isOpen =
        !isCollapsible ||
        (isControlled
            ? (expansionState[expansionKey] ?? !shouldStartClosed)
            : localIsOpen);

    const toggleOpen = () => {
        if (isControlled && onSetExpanded) {
            onSetExpanded(expansionKey, !isOpen);
        } else {
            setLocalIsOpen(!isOpen);
        }
    };

    const resolveObjectTarget = (draft: unknown): Record<string, unknown> => {
        const target = getByPath(draft, path);
        if (!target || typeof target !== "object" || Array.isArray(target)) {
            setByPath(draft, path, {});
            return (getByPath(draft, path) ?? {}) as Record<string, unknown>;
        }
        return target as Record<string, unknown>;
    };

    const handleAdd = (key: string, val: any) => {
        updateDraft(filename, (draft) => {
            const obj = resolveObjectTarget(draft);
            obj[key] = val;
        });
    };

    const handleRemove = (key: string) => {
        updateDraft(filename, (draft) => {
            const obj = resolveObjectTarget(draft);
            delete obj[key];
        });
    };

    return {
        data,
        shape,
        isCollapsible,
        isOpen,
        toggleOpen,
        handleAdd,
        handleRemove,
    };
};
