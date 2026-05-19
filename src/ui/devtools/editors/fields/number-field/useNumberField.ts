import { useState, useEffect, useCallback } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useSessionFlush } from "../../../state/moduleSession/useSessionFlush";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";

export const useNumberField = (filename: string, path: string) => {
    const value = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return 0;
                return (getByPath(session.draft, path) as number) ?? 0;
            },
            [filename, path],
        ),
    );

    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [localValue, setLocalValue] = useState(String(value ?? 0));

    useEffect(() => {
        setLocalValue(String(value ?? 0));
    }, [value]);

    const handleBlur = () => {
        const parsed = Number.parseFloat(localValue);
        const finalValue = Number.isNaN(parsed) ? 0 : parsed;

        // If formatting changed (e.g. 05 -> 5), update local display
        setLocalValue(String(finalValue));

        if (finalValue !== value) {
            updateDraft(filename, (draft) => {
                setByPath(draft, path, finalValue);
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.currentTarget.blur();
        }
    };

    const commitValue = (nextValue: string) => {
        const parsed = Number.parseFloat(nextValue);
        const finalValue = Number.isNaN(parsed) ? 0 : parsed;

        if (finalValue !== value) {
            updateDraft(filename, (draft) => {
                setByPath(draft, path, finalValue);
            });
        }
    };

    useSessionFlush(filename, handleBlur);

    return {
        localValue,
        setLocalValue,
        handleBlur,
        handleKeyDown,
        commitValue,
    };
};
