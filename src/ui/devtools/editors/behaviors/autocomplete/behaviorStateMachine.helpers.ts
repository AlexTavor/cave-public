import type { Suggestion } from "../../../../../lib/terminal/types";
import {
    ARITHMETIC_OPERATORS,
    COMPARISON_OPERATORS,
    EQUALITY_OPERATORS,
    ROOT_KEYWORDS,
} from "./behaviorStateMachine.constants";
import { shouldAllowArithmetic } from "./behaviorStateMachine.conditions";
import type { BehaviorSuggestionSeed } from "./behaviorStateMachine.types";
import type { SchemaNode } from "./schemaIntrospection";

export const buildSeeds = (
    labels: readonly string[],
    type: Suggestion["type"] = "value",
    replace?: Suggestion["replace"],
    cursor?: Suggestion["cursor"],
): BehaviorSuggestionSeed[] =>
    labels.map((label) => ({
        label,
        insertText: label,
        type,
        replace,
        cursor,
    }));

export const filterByPrefix = (
    values: readonly string[],
    prefix: string,
): readonly string[] => {
    if (!prefix) return values;
    const normalized = prefix.toLowerCase();
    return values.filter((value) => value.toLowerCase().startsWith(normalized));
};

export {
    getEntityRefs,
    getReferenceNode,
} from "./behaviorStateMachine.references";
export {
    shouldAllowArithmetic,
    shouldSuggestConditionBoundary,
} from "./behaviorStateMachine.conditions";

export const getStartSuggestions = (
    current: string,
): BehaviorSuggestionSeed[] =>
    buildSeeds(filterByPrefix([...ROOT_KEYWORDS], current));

export const hasValidStart = (tokens: string[]): boolean => {
    const first = tokens[0]?.toUpperCase();
    return !first || first === "WHEN";
};

export const getReferenceSuggestions = (
    node: SchemaNode,
    tokens: string[],
    current: string,
): BehaviorSuggestionSeed[] => {
    const suggestions: string[] = [];
    if (node.children && node.children.length > 0) {
        suggestions.push(".");
    }

    switch (node.type) {
        case "number": {
            suggestions.push(...COMPARISON_OPERATORS);
            if (shouldAllowArithmetic(tokens)) {
                suggestions.push(...ARITHMETIC_OPERATORS);
            }
            break;
        }
        case "string":
        case "boolean": {
            suggestions.push(...EQUALITY_OPERATORS);
            break;
        }
        case "object": {
            break;
        }
        case "unknown":
        default: {
            suggestions.push("=");
        }
    }

    const filtered = filterByPrefix(suggestions, current);
    return buildSeeds(filtered, "operator");
};
