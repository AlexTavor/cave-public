import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";

export const ensureStateEntry = (draft: Blueprint, key: string): void => {
    draft.components ??= {} as Blueprint["components"];
    draft.components.state ??= {};
    if (!draft.components.state[key]) {
        draft.components.state[key] = { value: 0, visible: false };
    }
};

export const createTraitToggleRule = (params: {
    id: string;
    resource: string;
    traitId: string;
    op: "<=" | ">";
}): BehaviorRule => ({
    id: params.id,
    sortKey: "sys_061",
    conditions: [
        {
            id: "resource_check",
            sortKey: "0",
            tokens: [
                { t: "ref", v: `self.state.${params.resource}.value` },
                { t: "op", v: params.op },
                { t: "val", v: 0 },
            ],
        },
    ],
    actions: [
        params.op === "<="
            ? { type: "ADD_TRAIT", traitId: params.traitId }
            : { type: "REMOVE_TRAIT", traitId: params.traitId },
    ],
});

