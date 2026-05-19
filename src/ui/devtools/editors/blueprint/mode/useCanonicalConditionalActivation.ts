import { useEffect } from "react";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { normalizeConditionalActivationConfigs } from "../../../../../data/schemas/abilities/conditionalActivation";
import { useSessionStore } from "../../../state/useSessionStore";

export const useCanonicalConditionalActivation = (
    filename: string,
    blueprintId: string,
    conditionalActivation: EditorAbilities["conditionalActivation"],
) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);

    useEffect(() => {
        if (!conditionalActivation || Array.isArray(conditionalActivation)) {
            return;
        }
        updateDraft(filename, (draft) => {
            const abilities = draft.blueprints[blueprintId]?._editor?.abilities;
            if (!abilities?.conditionalActivation) return;
            if (Array.isArray(abilities.conditionalActivation)) return;
            (abilities as EditorAbilities).conditionalActivation =
                normalizeConditionalActivationConfigs(
                    abilities.conditionalActivation,
                ) as EditorAbilities["conditionalActivation"];
        });
    }, [blueprintId, conditionalActivation, filename, updateDraft]);
};
