import type { Blueprint } from "../../../../data/schemas/blueprint";
import type { BehaviorComponent } from "../../../../data/schemas/behavior";
import type { BehaviorItem } from "../behaviors/types";
import { compileBehaviorRule } from "../behaviors/compiler";

const ensureComponents = (draft: Blueprint): Blueprint["components"] => {
    if (!draft.components) {
        draft.components = {} as Blueprint["components"];
    }
    return draft.components;
};

const ensureBehaviorComponent = (
    components: Blueprint["components"],
): BehaviorComponent => {
    components.behavior ??= { rules: [] } as BehaviorComponent;
    return components.behavior;
};

export const applyBehaviorAdd = (draft: Blueprint, tokens: string[]): void => {
    const components = ensureComponents(draft);
    const rule = compileBehaviorRule(tokens);
    const behavior = ensureBehaviorComponent(components);
    behavior.rules = [...behavior.rules, rule];
};

export const applyBehaviorRemoval = (
    draft: Blueprint,
    item: BehaviorItem,
): void => {
    const components = draft.components;
    if (!components) return;

    const behavior = components.behavior;
    if (!behavior) return;
    const rules = behavior.rules ?? [];
    components.behavior = {
        ...behavior,
        rules: rules.filter((rule) => rule.id !== item.source.ruleId),
    };
};
