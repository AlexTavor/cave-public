import { useCallback, useState } from "react";
import * as z from "zod";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { getDefaultValue, getZodType, unwrapSchema } from "../../utils";

type ZodDefLike = Readonly<{
    valueType?: unknown;
    value?: unknown;
    type?: unknown;
}>;

type ZodWithDefs = Readonly<{
    _def?: unknown;
    def?: unknown;
    valueType?: unknown;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const EMPTY_RECORD: Record<string, unknown> = {};

const isZodTypeAny = (value: unknown): value is z.ZodTypeAny =>
    typeof value === "object" &&
    value !== null &&
    "safeParse" in value &&
    typeof (value as { safeParse?: unknown }).safeParse === "function";

const getRecordValueSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
    const base = unwrapSchema(schema);

    if (getZodType(base) !== "record") {
        throw new Error("RecordField expected record schema");
    }

    const defs = base as unknown as ZodWithDefs;
    const rawDef = defs._def ?? defs.def;
    const def = rawDef as ZodDefLike | undefined;

    const candidates = [defs.valueType, def?.valueType, def?.value, def?.type];

    const match = candidates.find(isZodTypeAny);
    if (!match) {
        throw new Error("Record schema is missing value type");
    }

    return match;
};

export const useRecordField = (
    filename: string,
    path: string,
    schema: z.ZodTypeAny,
) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [addKey, setAddKey] = useState("");

    const data = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                const value = getByPath(session?.draft, path);
                return isRecord(value) ? value : EMPTY_RECORD;
            },
            [filename, path],
        ),
    );

    const valueSchema = getRecordValueSchema(schema);

    const resolveRecordTarget = (draft: unknown): Record<string, unknown> => {
        const target = getByPath(draft, path);
        if (!isRecord(target)) {
            setByPath(draft, path, {});
        }
        return (getByPath(draft, path) ?? {}) as Record<string, unknown>;
    };

    const handleAdd = (key: string): void => {
        const nextKey = key.trim();
        if (!nextKey) return;

        updateDraft(filename, (draft) => {
            const record = resolveRecordTarget(draft);
            if (record[nextKey] !== undefined) return;
            record[nextKey] = getDefaultValue(valueSchema);
        });

        setAddKey("");
    };

    const handleRemove = (key: string): void => {
        updateDraft(filename, (draft) => {
            const record = resolveRecordTarget(draft);
            delete record[key];
        });
    };

    return {
        data,
        addKey,
        setAddKey,
        handleAdd,
        handleRemove,
        valueSchema,
    };
};
