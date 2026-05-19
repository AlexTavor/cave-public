type BehaviorAction = {
    type?: string;
    op?: string;
    target?: string;
    value?: unknown;
};

const isMatchingAction = (action: BehaviorAction, key: string): boolean =>
    action.type === "MUTATE" &&
    action.op === "SUB" &&
    typeof action.target === "string" &&
    action.target.includes(key);

const resolveActionRate = (action: BehaviorAction): number | null => {
    if (typeof action.value === "number") return action.value;
    if (typeof action.value !== "string") return null;

    const matches = action.value.match(/(\d+\.?\d*)/g);
    if (!matches) return null;

    const rate = matches.find(
        (match: string) => match !== "1000" && match !== "1",
    );
    return rate ? Number.parseFloat(rate) : null;
};

export const resolveDynamicRate = (entity: any, key: string): number => {
    const rules = entity?.behavior?.rules ?? [];
    for (const rule of rules) {
        const actions: BehaviorAction[] = rule?.actions ?? [];
        for (const action of actions) {
            if (!isMatchingAction(action, key)) continue;
            const rate = resolveActionRate(action);
            if (rate !== null) return rate;
        }
    }
    return 0;
};
