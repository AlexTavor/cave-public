import { useState, useEffect, useMemo, useCallback } from "react";
import { z } from "zod";
import { ErrorContainer, FormWrapper } from "./SchemaForm.styles";
import { SchemaField } from "./fields/SchemaField";
import { SchemaFormContext } from "./SchemaFormContext";
import { useSessionStore } from "../state/useSessionStore";
import { getByPath } from "../../../utils/objectUtils";

interface SchemaFormProps {
    schema: z.ZodTypeAny;
    filename: string;
    rootPath?: string;
    expansionState?: Record<string, boolean>;
    onSetExpanded?: (path: string, isExpanded: boolean) => void;
}

export function SchemaForm({
    schema,
    filename,
    rootPath = "",
    expansionState,
    onSetExpanded,
}: Readonly<SchemaFormProps>) {
    const [error, setError] = useState<string | null>(null);

    const data = useSessionStore(
        useCallback(
            (state) => {
                const draft = state.sessions[filename]?.draft;
                if (!draft) return undefined;
                return getByPath(draft, rootPath);
            },
            [filename, rootPath],
        ),
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            const result = schema.safeParse(data);
            if (result.success) {
                setError(null);
            } else {
                setError(
                    result.error.issues
                        .map((i) => `${i.path.join(".")}: ${i.message}`)
                        .join("\n"),
                );
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [data, schema]);

    const contextValue = useMemo(
        () => ({
            schema,
            expansionState,
            onSetExpanded,
        }),
        [schema, expansionState, onSetExpanded],
    );

    return (
        <SchemaFormContext.Provider value={contextValue}>
            <FormWrapper>
                {error && <ErrorContainer>{error}</ErrorContainer>}
                <SchemaField
                    label="Root Object"
                    schema={schema}
                    filename={filename}
                    path={rootPath}
                />
            </FormWrapper>
        </SchemaFormContext.Provider>
    );
}
