import { useState, useEffect, useCallback } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useSessionFlush } from "../../../state/moduleSession/useSessionFlush";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";

export const useStringField = (filename: string, path: string) => {
    const value = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return "";
                return (getByPath(session.draft, path) as string) || "";
            },
            [filename, path],
        ),
    );

    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [localValue, setLocalValue] = useState(value);

    // Sync local state if parent value changes externally (e.g. undo/redo)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value) {
            updateDraft(filename, (draft) => {
                setByPath(draft, path, localValue);
            });
        }
    };

    useSessionFlush(filename, handleBlur);

    return {
        localValue,
        setLocalValue,
        handleBlur,
    };
};
