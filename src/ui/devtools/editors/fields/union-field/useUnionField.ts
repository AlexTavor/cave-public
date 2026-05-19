import { useCallback, useMemo } from "react";
import * as z from "zod";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { getDefaultValue, unwrapSchema } from "../../utils";

type ZodWithDefs = Readonly<{
    _def?: unknown;
    def?: unknown;
    options?: unknown;
}>;

type ZodUnionDef = Readonly<{ options?: unknown }>;

const isZodTypeAny = (value: unknown): value is z.ZodTypeAny =>
    typeof value === "object" &&
    value !== null &&
    "safeParse" in value &&
    typeof (value as { safeParse?: unknown }).safeParse === "function";

const getUnionOptions = (schema: z.ZodTypeAny): z.ZodTypeAny[] => {
    const base = unwrapSchema(schema) as unknown as ZodWithDefs;
    const def = (base._def ?? base.def) as ZodUnionDef | undefined;
    const options = base.options ?? def?.options;

    if (Array.isArray(options)) {
        return options.filter(isZodTypeAny);
    }

    return [];
};

export const useUnionField = (
    filename: string,
    path: string,
    schema: z.ZodTypeAny,
) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);

    const currentValue = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                return getByPath(session?.draft, path);
            },
            [filename, path],
        ),
    );

    const options = useMemo(() => getUnionOptions(schema), [schema]);

    const activeOptionIndex = useMemo(() => {
        if (options.length === 0) return 0;
        for (let i = 0; i < options.length; i += 1) {
            if (options[i].safeParse(currentValue).success) return i;
        }
        return 0;
    }, [currentValue, options]);

    const handleTypeChange = (index: number): void => {
        const selected = options[index];
        if (!selected) return;

        updateDraft(filename, (draft) => {
            setByPath(draft, path, getDefaultValue(selected));
        });
    };

    return {
        options,
        activeOptionIndex,
        handleTypeChange,
    };
};
