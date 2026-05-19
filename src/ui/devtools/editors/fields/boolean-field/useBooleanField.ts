import { useCallback } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";

export const useBooleanField = (filename: string, path: string) => {
    const value = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return false;
                return !!getByPath(session.draft, path);
            },
            [filename, path],
        ),
    );

    const updateDraft = useSessionStore((state) => state.updateDraft);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateDraft(filename, (draft) => {
            setByPath(draft, path, e.target.checked);
        });
    };

    return { value, handleChange };
};
