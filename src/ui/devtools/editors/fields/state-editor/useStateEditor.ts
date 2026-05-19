import { useCallback, useMemo, useState } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useBlueprintContext } from "../../blueprint/BlueprintContext";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";

export interface StateEntry {
    key: string;
    value: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const normalizeStateRecord = (value: unknown): Record<string, any> =>
    isRecord(value) ? (value as Record<string, any>) : {};

const ensureStateComponent = (draft: any): Record<string, any> => {
    draft.components ??= {};
    draft.components.state ??= {};
    return draft.components.state as Record<string, any>;
};

export const useStateEditor = () => {
    const { filename, blueprintId } = useBlueprintContext();
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const [filter, setFilter] = useState("");
    const [addKey, setAddKey] = useState("");

    const stateRecord = normalizeStateRecord(
        useBlueprintSlice(filename, blueprintId)?.components?.state,
    );

    const entries = useMemo<StateEntry[]>(() => {
        return Object.entries(stateRecord).map(([key, entry]) => {
            const value = isRecord(entry) ? entry.value : entry;
            return {
                key,
                value:
                    typeof value === "number" && Number.isFinite(value)
                        ? value
                        : 0,
            };
        });
    }, [stateRecord]);

    const filteredEntries = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        if (!needle) return entries;
        return entries.filter((entry) =>
            entry.key.toLowerCase().includes(needle),
        );
    }, [entries, filter]);

    const addEntry = useCallback(() => {
        const nextKey = addKey.trim();
        if (!nextKey) return;

        updateDraft(filename, (moduleDraft) => {
            const blueprint = moduleDraft.blueprints[blueprintId];
            if (!blueprint) return;
            const state = ensureStateComponent(blueprint);
            if (state[nextKey] !== undefined) return;
            state[nextKey] = { value: 0, visible: true };
        });

        setAddKey("");
    }, [addKey, filename, blueprintId, updateDraft]);

    return {
        filter,
        setFilter,
        addKey,
        setAddKey,
        entries: filteredEntries,
        addEntry,
    };
};
