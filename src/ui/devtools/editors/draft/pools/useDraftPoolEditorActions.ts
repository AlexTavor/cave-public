import { useCallback } from "react";
import type {
    DraftOptionBlueprint,
    DraftPoolEntry,
} from "../../../../../data/schemas/draft";
import { setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";

interface Params {
    filename: string;
    poolId: string;
    entries: DraftPoolEntry[];
    options: Record<string, DraftOptionBlueprint>;
    setInput: (value: string) => void;
    setError: (value: string | null) => void;
}

export const useDraftPoolEditorActions = ({
    filename,
    poolId,
    entries,
    options,
    setInput,
    setError,
}: Params) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);

    const setEntries = useCallback(
        (next: DraftPoolEntry[]) => {
            updateDraft(filename, (draft) => {
                setByPath(draft, `draftPools.${poolId}.entries`, next);
            });
        },
        [filename, poolId, updateDraft],
    );

    const addEntry = useCallback(
        (optionId: string) => {
            if (!options[optionId]) return setError("Unknown option id.");
            if (entries.some((entry) => entry.optionId === optionId)) {
                return setError("Option already in pool.");
            }
            setEntries([...entries, { optionId, weight: 1 }]);
            setInput("");
            setError(null);
        },
        [entries, options, setEntries, setError, setInput],
    );

    const updateWeight = useCallback(
        (index: number, weight: number) => {
            setEntries(
                entries.map((entry, entryIndex) =>
                    entryIndex === index
                        ? { ...entry, weight: Math.max(0, weight) }
                        : entry,
                ),
            );
        },
        [entries, setEntries],
    );

    const removeEntry = useCallback(
        (index: number) => setEntries(entries.filter((_, i) => i !== index)),
        [entries, setEntries],
    );

    const updateOneOff = useCallback(
        (optionId: string, checked: boolean) => {
            updateDraft(filename, (draft) => {
                const option = draft.draftOptions?.[optionId];
                if (option) option.oneOff = checked;
            });
        },
        [filename, updateDraft],
    );

    const addText = useCallback(() => {
        updateDraft(filename, (draft) => {
            const texts = draft.draftPools?.[poolId]?.texts ?? [];
            setByPath(draft, `draftPools.${poolId}.texts`, [...texts, ""]);
        });
    }, [filename, poolId, updateDraft]);

    const removeText = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const texts = draft.draftPools?.[poolId]?.texts ?? [];
                setByPath(
                    draft,
                    `draftPools.${poolId}.texts`,
                    texts.filter((_, textIndex) => textIndex !== index),
                );
            });
        },
        [filename, poolId, updateDraft],
    );

    return {
        addEntry,
        updateWeight,
        removeEntry,
        updateOneOff,
        addText,
        removeText,
    };
};
