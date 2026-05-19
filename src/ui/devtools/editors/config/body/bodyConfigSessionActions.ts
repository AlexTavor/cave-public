import { setByPath } from "../../../../../utils/objectUtils";
import type {
    HabitusDefinition,
    HabitusTypeId,
    HabitusTypeRule,
} from "../../../../../data/schemas/game/habiti";
import { BODY_RULES_PATH, HABITI_PATH } from "./bodyPaths";
import {
    countPoolEntries,
    prunePoolsAgainstRegistry,
    removeHabitusFromPools,
    renameHabitusInPools,
} from "./bodyConfigSessionMutations";
import { createBodyConfigRuleActions } from "./bodyConfigRuleActions";

export const createBodyConfigSessionActions = (input: {
    filename: string;
    rules: HabitusTypeRule[];
    habitusIndex: Record<string, HabitusDefinition>;
    pushToast: (type: "success" | "info" | "error", message: string) => void;
    updateDraft: (filename: string, updater: (draft: unknown) => void) => void;
}) => ({
    ...createBodyConfigRuleActions(input),
    setHabitusType: (habitusId: string, nextType: HabitusTypeId) => {
        const nextHabitusIndex = {
            ...input.habitusIndex,
            [habitusId]: { ...input.habitusIndex[habitusId], type: nextType },
        };
        const nextRules = prunePoolsAgainstRegistry(
            input.rules,
            nextHabitusIndex,
        );
        if (countPoolEntries(nextRules) !== countPoolEntries(input.rules)) {
            input.pushToast(
                "error",
                "Pruned weighted-pool entries after Habitus type change.",
            );
        }
        input.updateDraft(input.filename, (draft) => {
            setByPath(draft, HABITI_PATH, nextHabitusIndex);
            setByPath(draft, BODY_RULES_PATH, nextRules);
        });
    },
    removeHabitus: (id: string) =>
        input.updateDraft(input.filename, (draft) => {
            const { [id]: _removed, ...nextHabiti } = input.habitusIndex;
            setByPath(draft, HABITI_PATH, nextHabiti);
            setByPath(
                draft,
                BODY_RULES_PATH,
                removeHabitusFromPools(input.rules, id),
            );
        }),
    renameHabitus: (oldId: string, nextId: string) => {
        const id = nextId.trim();
        if (!id) return "empty";
        if (id !== oldId && input.habitusIndex[id]) {
            input.pushToast("error", `ID '${id}' already exists.`);
            return "duplicate";
        }
        input.updateDraft(input.filename, (draft) => {
            const { [oldId]: current, ...rest } = input.habitusIndex;
            setByPath(draft, HABITI_PATH, {
                ...rest,
                [id]: { ...current, id },
            });
            setByPath(
                draft,
                BODY_RULES_PATH,
                renameHabitusInPools(input.rules, oldId, id),
            );
        });
        return null;
    },
});
