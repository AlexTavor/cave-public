import { useCallback } from "react";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import type {
    HabitusDefinition,
    HabitusTypeRule,
} from "../../../../../data/schemas/game/habiti";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { useSessionStore } from "../../../state/useSessionStore";
import { useToastStore } from "../../../toast/toastStore";
import { BODY_RULES_PATH, HABITI_PATH } from "./bodyPaths";
import { createDefaultHabitus } from "./bodyEditorDefaults";
import { createBodyConfigSessionActions } from "./bodyConfigSessionActions";
import {
    getHabitusPoolSuggestions,
    validateWeightedPoolEntries,
} from "./bodyRuleValidation";
import { HABITUS_TYPES, IDENTITY_HABITUS_TYPES } from "./habitusTypes";

const EMPTY_HABITI: Record<string, HabitusDefinition> = {};
const EMPTY_RULES: HabitusTypeRule[] = [];

export const useBodyConfigSession = (filename: string) => {
    useEnsureModuleSession(filename);
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const pushToast = useToastStore((state) => state.push);
    const habitusIndex = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    HABITI_PATH,
                ) as Record<string, HabitusDefinition>) ?? EMPTY_HABITI,
            [filename],
        ),
    );
    const rules = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    BODY_RULES_PATH,
                ) as HabitusTypeRule[]) ?? EMPTY_RULES,
            [filename],
        ),
    );
    const addHabitus = () => {
        const id = `habitus-${Date.now().toString(36)}`;
        updateDraft(filename, (draft) =>
            setByPath(draft, HABITI_PATH, {
                ...habitusIndex,
                [id]: createDefaultHabitus(id),
            }),
        );
    };
    const actions = createBodyConfigSessionActions({
        filename,
        rules,
        habitusIndex,
        pushToast,
        updateDraft,
    });
    return {
        habitusIndex,
        habitusIds: Object.keys(habitusIndex),
        rules,
        taxonomyGroups: IDENTITY_HABITUS_TYPES.map((type) => ({
            type,
            ids: Object.values(habitusIndex)
                .filter((definition) => definition.type === type)
                .map((definition) => definition.id)
                .sort((left, right) => left.localeCompare(right)),
        })),
        availableRuleTypes: HABITUS_TYPES.filter(
            (type) => !rules.some((rule) => rule.habitusType === type),
        ),
        getPoolSuggestions: (habitusType: HabitusTypeRule["habitusType"]) =>
            getHabitusPoolSuggestions(habitusIndex, habitusType),
        validateWeightedPool: (
            entries: HabitusTypeRule["weightedPool"],
            habitusType: HabitusTypeRule["habitusType"],
        ) =>
            validateWeightedPoolEntries({ entries, habitusIndex, habitusType }),
        addHabitus,
        removeHabitus: actions.removeHabitus,
        renameHabitus: actions.renameHabitus,
        setHabitusType: actions.setHabitusType,
        addTypeRule: actions.addTypeRule,
        removeTypeRule: actions.removeTypeRule,
        setRuleHabitusType: actions.setRuleHabitusType,
        commitWeightedPool: actions.commitWeightedPool,
    };
};
