import { useCallback } from "react";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { useToastStore } from "../../../toast/toastStore";
import type { GuidanceDefinition } from "../../../../../data/schemas/guidances";
import { createDefaultGuidance } from "./guidanceEditorDefaults";
import { GUIDANCES_PATH } from "./guidanceFieldSchemas";

const EMPTY_GUIDANCES: GuidanceDefinition[] = [];

const getGuidances = (draft: unknown) =>
    ((getByPath(draft, GUIDANCES_PATH) as GuidanceDefinition[]) ?? []).slice();

export const useGuidancesSession = (filename: string) => {
    const rawGuidances = useSessionStore(
        useCallback(
            (state) =>
                getByPath(state.sessions[filename]?.draft, GUIDANCES_PATH) as
                    | GuidanceDefinition[]
                    | undefined,
            [filename],
        ),
    );
    const guidances = rawGuidances ?? EMPTY_GUIDANCES;
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const pushToast = useToastStore((state) => state.push);

    const update = useCallback(
        (updater: (current: GuidanceDefinition[]) => GuidanceDefinition[]) => {
            updateDraft(filename, (draft) =>
                setByPath(draft, GUIDANCES_PATH, updater(getGuidances(draft))),
            );
        },
        [filename, updateDraft],
    );

    return {
        guidances,
        addGuidance: () =>
            update((current) => [
                ...current,
                createDefaultGuidance(`guidance_${current.length + 1}`),
            ]),
        removeGuidance: (index: number) =>
            update((current) => current.filter((_, i) => i !== index)),
        renameGuidance: (index: number, id: string) => {
            if (
                guidances.some(
                    (item, i) => i !== index && item.id === id.trim(),
                )
            ) {
                pushToast("error", `ID "${id}" already exists.`);
                return "duplicate";
            }
            update((current) =>
                current.map((item, i) =>
                    i === index ? { ...item, id: id.trim() } : item,
                ),
            );
            return null;
        },
    };
};
