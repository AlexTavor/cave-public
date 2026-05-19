import { useCallback } from "react";
import { useModuleStore } from "../../../state/moduleStore";
import { useSessionStore } from "../../../state/useSessionStore";
import { setByPath } from "../../../../../utils/objectUtils";
import type { DraftPoolEntry } from "../../../../../data/schemas/draft";

export const useCreatePoolOption = (
    filename: string,
    poolId: string,
    entries: DraftPoolEntry[],
) => {
    const createDraftOption = useModuleStore((s) => s.createDraftOption);
    const updateDraft = useSessionStore((s) => s.updateDraft);

    return useCallback(async () => {
        const optionId = await createDraftOption({ filename });
        const mod = useModuleStore.getState().modules[filename];
        const opt = mod?.draftOptions?.[optionId];
        if (!opt) return;

        updateDraft(filename, (draft) => {
            draft.draftOptions ??= {};
            draft.draftOptions[optionId] = { ...opt };
            setByPath(draft, `draftPools.${poolId}.entries`, [
                ...entries,
                { optionId, weight: 1 },
            ]);
        });
    }, [createDraftOption, entries, filename, poolId, updateDraft]);
};
