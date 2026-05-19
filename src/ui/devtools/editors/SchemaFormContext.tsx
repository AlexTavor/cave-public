import { createContext, useContext } from "react";
import { z } from "zod";

export interface SchemaFormContextValue {
    schema: z.ZodTypeAny;
    expansionState?: Record<string, boolean>;
    onSetExpanded?: (path: string, isExpanded: boolean) => void;
}

export const SchemaFormContext = createContext<SchemaFormContextValue | null>(
    null,
);

export const useSchemaFormContext = () => {
    const ctx = useContext(SchemaFormContext);
    if (!ctx)
        throw new Error(
            "useSchemaFormContext must be used within a SchemaForm",
        );
    return ctx;
};
