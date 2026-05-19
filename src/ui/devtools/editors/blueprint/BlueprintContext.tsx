import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createBlueprintScopeId } from "../../state/moduleSession/scopes";

export interface BlueprintContextValue {
    filename: string;
    blueprintId: string;
    scopeId: string;
    rootPath: string;
}

const BlueprintContext = createContext<BlueprintContextValue | null>(null);

interface BlueprintProviderProps {
    value: {
        filename: string;
        blueprintId: string;
    };
    children: ReactNode;
}

export const BlueprintProvider = ({
    value,
    children,
}: BlueprintProviderProps) => {
    const scopeId = createBlueprintScopeId(value.blueprintId);
    const rootPath = `blueprints.${value.blueprintId}`;
    const contextValue = useMemo(
        () => ({
            filename: value.filename,
            blueprintId: value.blueprintId,
            scopeId,
            rootPath,
        }),
        [value.filename, value.blueprintId, scopeId, rootPath],
    );
    return (
        <BlueprintContext.Provider value={contextValue}>
            {children}
        </BlueprintContext.Provider>
    );
};

export const useBlueprintContext = () => {
    const ctx = useContext(BlueprintContext);
    if (!ctx) {
        throw new Error(
            "useBlueprintContext must be used within BlueprintProvider",
        );
    }
    return ctx;
};
