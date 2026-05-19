import { setByPath } from "../../../../../utils/objectUtils";
import type {
    HabitusDefinition,
    HabitusTypeId,
    HabitusTypeRule,
    WeightedHabitusPoolEntry,
} from "../../../../../data/schemas/game/habiti";
import { BODY_RULES_PATH } from "./bodyPaths";
import { createDefaultHabitusTypeRule } from "./bodyEditorDefaults";
import { findFirstMissingHabitusType } from "./bodyConfigSessionMutations";
import {
    validateHabitusTypeRuleTypeChange,
    validateWeightedPoolEntries,
} from "./bodyRuleValidation";

const hasPoolIssues = (validation: {
    duplicateIds: string[];
    unknownIds: string[];
    incompatibleIds: string[];
}) =>
    validation.duplicateIds.length > 0 ||
    validation.unknownIds.length > 0 ||
    validation.incompatibleIds.length > 0;

export const createBodyConfigRuleActions = (input: {
    filename: string;
    rules: HabitusTypeRule[];
    habitusIndex: Record<string, HabitusDefinition>;
    pushToast: (type: "success" | "info" | "error", message: string) => void;
    updateDraft: (filename: string, updater: (draft: unknown) => void) => void;
}) => ({
    addTypeRule: () => {
        const habitusType = findFirstMissingHabitusType(input.rules);
        if (!habitusType) return false;
        input.updateDraft(input.filename, (draft) =>
            setByPath(draft, BODY_RULES_PATH, [
                ...input.rules,
                createDefaultHabitusTypeRule(habitusType),
            ]),
        );
        return true;
    },
    removeTypeRule: (index: number) =>
        input.updateDraft(input.filename, (draft) =>
            setByPath(
                draft,
                BODY_RULES_PATH,
                input.rules.filter((_, currentIndex) => currentIndex !== index),
            ),
        ),
    setRuleHabitusType: (index: number, nextType: HabitusTypeId) => {
        const rule = input.rules[index];
        if (!rule) return null;
        const typeChange = validateHabitusTypeRuleTypeChange(
            input.rules,
            index,
            nextType,
        );
        if (!typeChange.success) {
            input.pushToast("error", `Rule type '${nextType}' already exists.`);
            return typeChange.reason;
        }
        const validation = validateWeightedPoolEntries({
            entries: rule.weightedPool,
            habitusIndex: input.habitusIndex,
            habitusType: nextType,
        });
        if (hasPoolIssues(validation))
            input.pushToast("error", "Pruned invalid weighted-pool entries.");
        input.updateDraft(input.filename, (draft) =>
            setByPath(
                draft,
                BODY_RULES_PATH,
                input.rules.map((currentRule, currentIndex) =>
                    currentIndex === index
                        ? {
                              ...currentRule,
                              habitusType: nextType,
                              weightedPool: validation.validEntries,
                          }
                        : currentRule,
                ),
            ),
        );
        return null;
    },
    commitWeightedPool: (
        index: number,
        entries: WeightedHabitusPoolEntry[],
    ) => {
        const rule = input.rules[index];
        if (!rule) return [];
        const validation = validateWeightedPoolEntries({
            entries,
            habitusIndex: input.habitusIndex,
            habitusType: rule.habitusType,
        });
        if (hasPoolIssues(validation))
            input.pushToast("error", "Ignored invalid weighted-pool entries.");
        return validation.validEntries;
    },
});
