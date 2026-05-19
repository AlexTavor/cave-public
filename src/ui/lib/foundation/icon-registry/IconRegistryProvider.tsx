import React, { useState, useCallback, useMemo, useEffect } from "react";
import { IconRegistryContext } from "./IconRegistryContext";
import { IconDefinition, IconRegistryContextValue } from "./types";
import { defaultIcons } from "./defaultIcons";

interface Props {
    children: React.ReactNode;
    extraIcons?: Record<string, IconDefinition>;
}

export const IconRegistryProvider: React.FC<Props> = ({
    children,
    extraIcons,
}) => {
    const [registry, setRegistry] =
        useState<Record<string, IconDefinition>>(defaultIcons);

    useEffect(() => {
        if (extraIcons) {
            setRegistry({
                ...defaultIcons,
                ...extraIcons,
            });
            return;
        }

        setRegistry(defaultIcons);
    }, [extraIcons]);

    const getIcon = useCallback(
        (id: string): IconDefinition | null => {
            return registry[id] || null;
        },
        [registry]
    );

    const registerIcon = useCallback((id: string, def: IconDefinition) => {
        setRegistry((prev) => ({ ...prev, [id]: def }));
    }, []);

    const hasIcon = useCallback(
        (id: string): boolean => {
            return id in registry;
        },
        [registry]
    );

    const getAllIcons = useCallback(() => {
        return registry;
    }, [registry]);

    const value: IconRegistryContextValue = useMemo(
        () => ({
            getIcon,
            registerIcon,
            hasIcon,
            getAllIcons,
        }),
        [getIcon, registerIcon, hasIcon, getAllIcons]
    );

    return (
        <IconRegistryContext.Provider value={value}>
            {children}
        </IconRegistryContext.Provider>
    );
};
