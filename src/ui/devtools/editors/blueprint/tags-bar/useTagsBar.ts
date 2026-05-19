import { useCallback, useState } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useBlueprintContext } from "../BlueprintContext";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";

export const useTagsBar = () => {
    const { filename, blueprintId } = useBlueprintContext();
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const blueprint = useBlueprintSlice(filename, blueprintId);
    const tags: string[] = blueprint?.tags ?? [];

    const [draft, setDraft] = useState("");

    const addTag = useCallback(() => {
        const val = draft.trim();
        if (!val || tags.includes(val)) return;
        updateDraft(filename, (moduleDraft) => {
            const bp = moduleDraft.blueprints[blueprintId];
            if (!bp) return;
            bp.tags = [...(bp.tags ?? []), val];
        });
        setDraft("");
    }, [draft, tags, filename, blueprintId, updateDraft]);

    const removeTag = useCallback(
        (tag: string) => {
            updateDraft(filename, (moduleDraft) => {
                const bp = moduleDraft.blueprints[blueprintId];
                if (!bp) return;
                bp.tags = (bp.tags ?? []).filter((t: string) => t !== tag);
            });
        },
        [filename, blueprintId, updateDraft],
    );

    return { tags, draft, setDraft, addTag, removeTag };
};
