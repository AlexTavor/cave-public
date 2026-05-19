import { describe, expect, it, vi } from "vitest";
import { createBodyConfigSessionActions } from "./bodyConfigSessionActions";

const updateDraft =
    (draft: any) => (_: string, updater: (draft: unknown) => void) =>
        updater(draft);
const rules = [
    {
        habitusType: "species",
        probability: 1,
        maxCount: 1,
        weightedPool: [{ habitusId: "alpha", weight: 2 }],
    },
    {
        habitusType: "gender",
        probability: 1,
        maxCount: 1,
        weightedPool: [{ habitusId: "beta", weight: 1 }],
    },
] as any;
const habitusIndex = {
    alpha: {
        id: "alpha",
        label: "Alpha",
        type: "species",
        effects: [],
        excludes: [],
    },
    beta: {
        id: "beta",
        label: "Beta",
        type: "gender",
        effects: [],
        excludes: [],
    },
} as any;

describe("createBodyConfigSessionActions", () => {
    it("rewrites and prunes weighted pools across Habitus changes", () => {
        const draft = {
            config: {
                habiti: habitusIndex,
                settings: { body: { habitusTypeRules: rules } },
            },
        };
        const actions = createBodyConfigSessionActions({
            filename: "test",
            rules,
            habitusIndex,
            pushToast: vi.fn(),
            updateDraft: updateDraft(draft),
        });
        actions.renameHabitus("alpha", "omega");
        expect(
            draft.config.settings.body.habitusTypeRules[0].weightedPool,
        ).toEqual([{ habitusId: "omega", weight: 2 }]);
        actions.setHabitusType("beta", "species");
        expect(
            draft.config.settings.body.habitusTypeRules[1].weightedPool,
        ).toEqual([]);
    });

    it("rejects duplicate rule types", () => {
        const actions = createBodyConfigSessionActions({
            filename: "test",
            rules,
            habitusIndex,
            pushToast: vi.fn(),
            updateDraft: updateDraft({}),
        });
        expect(actions.setRuleHabitusType(0, "gender")).toBe("duplicate");
    });
});
