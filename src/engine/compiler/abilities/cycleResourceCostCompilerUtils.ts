import type { Blueprint } from "../../../data/schemas/blueprint";
export { resolveDefaultResourceProgressBarColor as resolveCycleCostBarColor } from "../../../lib/displays/resourceProgressBarColor";

export const findCycleCostRules = (draft: Blueprint) =>
    (draft.components?.behavior?.rules ?? []).filter((rule) =>
        [
            "sys_cycle_accumulate",
            "sys_cycle_reset",
            "sys_cycle_transition",
        ].includes(rule.id),
    );

export const ensureCycleCountTracking = (draft: Blueprint) => {
    draft.components ??= {} as Blueprint["components"];
    draft.components.state ??= {};
    draft.components.state.cycle_count ??= { value: 1, visible: false };
    const resetRule = draft.components.behavior?.rules?.find(
        (rule) => rule.id === "sys_cycle_reset",
    );
    const hasIncrement = resetRule?.actions.some(
        (action) =>
            action.type === "MUTATE" &&
            action.target === "self.state.cycle_count.value",
    );
    if (!resetRule || hasIncrement) return;
    resetRule.actions.push({
        type: "MUTATE",
        target: "self.state.cycle_count.value",
        op: "ADD",
        value: 1,
    });
};
