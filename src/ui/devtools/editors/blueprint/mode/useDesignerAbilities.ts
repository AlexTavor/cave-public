import { useCallback, useMemo } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useBlueprintContext } from "../BlueprintContext";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";
import { getDefaultValue } from "../../utils";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import {
    createCycleAbilityDraft,
    createInjectionAbilityDraft,
} from "./abilityDrafts";
import { ensureWorldPresenceDraft } from "../visuals/blueprintVisualsWorldPresenceDraft";
import { abilitySchemas, arrayAbilities } from "./abilitySchemas";
import {
    addArrayAbilityItem,
    type ArrayAbilityKey,
} from "./abilityListMutations";
import { useCanonicalConditionalActivation } from "./useCanonicalConditionalActivation";

export type AbilityKey = keyof typeof abilitySchemas;

export const useDesignerAbilities = () => {
    const { filename, blueprintId } = useBlueprintContext();
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const blueprint = useBlueprintSlice(filename, blueprintId);
    const abilities = blueprint?._editor?.abilities ?? {};
    useCanonicalConditionalActivation(
        filename,
        blueprintId,
        abilities.conditionalActivation,
    );
    const abilityKeys = useMemo(
        () => Object.keys(abilities) as AbilityKey[],
        [abilities],
    );
    const canAddAbility = useCallback(
        (ability: AbilityKey) =>
            arrayAbilities.has(ability) || !abilityKeys.includes(ability),
        [abilityKeys],
    );

    const addAbility = useCallback(
        (ability: AbilityKey) => {
            updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target) return;
                target._editor ??= { abilities: {} };
                target._editor.abilities ??= {};
                if (!arrayAbilities.has(ability)) {
                    if (target._editor.abilities[ability]) return;
                    if (ability === "worldPresence") {
                        ensureWorldPresenceDraft(draft, blueprintId);
                        return;
                    }
                    let nextValue: EditorAbilities[AbilityKey];
                    if (ability === "cycle") {
                        nextValue = createCycleAbilityDraft();
                    } else if (ability === "injection") {
                        nextValue = createInjectionAbilityDraft();
                    } else {
                        nextValue = getDefaultValue(
                            abilitySchemas[ability],
                        ) as EditorAbilities[AbilityKey];
                    }
                    const abilityConfig = target._editor.abilities as Record<
                        AbilityKey,
                        EditorAbilities[AbilityKey] | undefined
                    >;
                    abilityConfig[ability] = nextValue;
                    return;
                }
                addArrayAbilityItem(
                    target._editor.abilities,
                    ability as ArrayAbilityKey,
                );
            });
        },
        [filename, blueprintId, updateDraft],
    );

    const removeAbility = useCallback(
        (ability: AbilityKey) => {
            updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                if (!target?._editor?.abilities) return;
                delete target._editor.abilities[ability];
            });
        },
        [filename, blueprintId, updateDraft],
    );

    const removeAbilityItem = useCallback(
        (ability: ArrayAbilityKey, index: number) => {
            updateDraft(filename, (draft) => {
                const target = draft.blueprints[blueprintId];
                const abilities = target?._editor?.abilities;
                const list = abilities?.[ability];
                if (!Array.isArray(list)) return;
                list.splice(index, 1);
                if (list.length === 0) delete abilities?.[ability];
            });
        },
        [filename, blueprintId, updateDraft],
    );

    return {
        abilities,
        abilityKeys,
        addAbility,
        removeAbility,
        removeAbilityItem,
        canAddAbility,
    };
};

