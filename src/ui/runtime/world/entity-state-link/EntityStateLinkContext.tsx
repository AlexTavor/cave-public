import React, { createContext, useMemo } from "react";
import { useWorldInteraction } from "../context/WorldInteractionContext";
import type { EntityStateLinkContextValue } from "./types";
import { useEntityBarRuntime } from "./entityStateLinkRuntime";
import { useEntityTextRuntime } from "./useEntityTextRuntime";

export const EntityStateLinkContext =
    createContext<EntityStateLinkContextValue | null>(null);

export const EntityStateLinkProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const { runtime } = useWorldInteraction();
    const { register, unregister } = useEntityBarRuntime(runtime);
    const { registerText, unregisterText } = useEntityTextRuntime(runtime);

    const value = useMemo(
        () => ({ register, unregister, registerText, unregisterText }),
        [register, registerText, unregister, unregisterText],
    );

    return (
        <EntityStateLinkContext.Provider value={value}>
            {children}
        </EntityStateLinkContext.Provider>
    );
};

