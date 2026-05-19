import type { Blueprint } from "../../../../data/schemas/blueprint";
import type { LogicToken } from "../../../../data/schemas/logic";
import type {
    BehaviorAction,
    BehaviorRule,
} from "../../../../data/schemas/behavior";
import type { BehaviorItem } from "../behaviors/types";

const tokensToSentence = (tokens: LogicToken[]): string =>
    tokens.map((token) => String(token.v)).join(" ");

const actionToSentence = (action: BehaviorAction): string => {
    switch (action.type) {
        case "MUTATE":
            return `${action.op} ${action.target} ${action.value}`;
        case "TRANSFER":
            return `TRANSFER ${action.amount} ${action.resource} FROM ${action.source} TO ${action.target}`;
        case "DISPATCH":
            return `DISPATCH ${action.entity} TO ${action.target}`;
        case "SPAWN":
            return `SPAWN ${action.blueprintId}`;
        case "KILL":
            return `KILL ${action.entityId}`;
    }

    return "";
};

const ruleToSentence = (rule: BehaviorRule): string => {
    const conditionText = rule.conditions
        .map((condition) => tokensToSentence(condition.tokens))
        .filter((chunk) => chunk.length > 0)
        .join(" AND ");

    const actionText = rule.actions
        .map(actionToSentence)
        .filter((chunk) => chunk.length > 0)
        .join(" AND ");

    return `WHEN ${conditionText || "true"} DO ${actionText}`.trim();
};

export const buildBehaviorItems = (
    components: Blueprint["components"] | undefined,
): BehaviorItem[] => {
    const items: BehaviorItem[] = [];
    const behaviorRules = components?.behavior?.rules ?? [];

    for (const rule of behaviorRules) {
        items.push({
            id: rule.id,
            kind: "behavior",
            sentence: ruleToSentence(rule),
            sortKey: rule.sortKey ?? rule.id,
            source: { ruleId: rule.id },
        });
    }

    return items.sort((left, right) =>
        left.sortKey.localeCompare(right.sortKey),
    );
};
