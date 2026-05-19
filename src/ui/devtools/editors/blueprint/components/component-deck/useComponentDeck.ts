import { useState } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useBlueprintActions } from "../../hooks/useBlueprintActions";
import { ALL_COMPONENT_KEYS, ComponentKey } from "../../registry";
import type { Blueprint } from "../../../../../../data/schemas/blueprint";
import { useBlueprintContext } from "../../BlueprintContext";
import { useBlueprintSlice } from "../../../../state/moduleSession/useBlueprintSlice";

// Interface for what the hook returns
interface UseComponentDeckResult {
    sessionId: string;
    hasDraft: boolean;
    components: Blueprint["components"];
    expandedRows: Record<string, boolean>;
    missingKeys: ComponentKey[];
    addKey: ComponentKey | "";
    setAddKey: (key: ComponentKey | "") => void;
    addComponent: () => void;
    removeComponent: (key: ComponentKey) => void;
    toggleRow: (key: string, isOpen: boolean) => void;
}

export const useComponentDeck = (): UseComponentDeckResult => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();

    // Selectors
    const draft = useBlueprintSlice(filename, blueprintId);
    const expandedRows = useSessionStore(
        (s) => s.sessions[filename]?.ui?.[scopeId]?.expandedRows ?? {},
    );

    // Actions
    const actions = useBlueprintActions();

    // Local State
    const [addKey, setAddKey] = useState<ComponentKey | "">("");

    // Safe access
    const components = draft?.components ?? {};

    // Derived Logic
    const missingKeys = ALL_COMPONENT_KEYS.filter(
        (k) => components?.[k] === undefined,
    );

    const addComponent = () => {
        if (!addKey) return;
        actions.addComponent(addKey);
        setAddKey("");
    };

    const removeComponent = (key: ComponentKey) => {
        actions.removeComponent(key);
    };

    const toggleRow = (key: string, isOpen: boolean) => {
        actions.toggleComponent(key, isOpen);
    };

    return {
        sessionId: filename,
        hasDraft: !!draft,
        components,
        expandedRows,
        missingKeys,
        addKey,
        setAddKey,
        addComponent,
        removeComponent,
        toggleRow,
    };
};
