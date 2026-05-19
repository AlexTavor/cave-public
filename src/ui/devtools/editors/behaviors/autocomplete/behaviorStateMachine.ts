import type {
    BehaviorStateMachineInput,
    BehaviorSuggestionSeed,
} from "./behaviorStateMachine.types";
import { EFFECT_VERBS } from "./behaviorStateMachine.constants";
import {
    buildSeeds,
    filterByPrefix,
    getEntityRefs,
    getReferenceNode,
    getReferenceSuggestions,
    getStartSuggestions,
    hasValidStart,
    shouldSuggestConditionBoundary,
} from "./behaviorStateMachine.helpers";

export const behaviorStateMachine = (
    input: BehaviorStateMachineInput,
): BehaviorSuggestionSeed[] => {
    const { tokens, currentToken, previousToken, moduleData, draft } = input;
    const normalizedCurrent = currentToken.toLowerCase();
    const previousUpper = previousToken.toUpperCase();
    const isFirstToken =
        tokens.length === 0 || (tokens.length <= 1 && !previousToken);

    if (isFirstToken) {
        return getStartSuggestions(normalizedCurrent);
    }

    if (!hasValidStart(tokens)) {
        return getStartSuggestions(normalizedCurrent);
    }

    if (previousUpper === "WHEN" || previousUpper === "IF") {
        return buildSeeds(
            filterByPrefix(getEntityRefs(moduleData), normalizedCurrent),
        );
    }

    if (
        shouldSuggestConditionBoundary(
            tokens,
            currentToken,
            previousToken,
            moduleData,
            draft,
        )
    ) {
        return buildSeeds(filterByPrefix(["DO", "AND"], normalizedCurrent));
    }

    if (previousUpper === "DO") {
        return buildSeeds(filterByPrefix(EFFECT_VERBS, normalizedCurrent));
    }

    const referenceNode = getReferenceNode(previousToken, moduleData, draft);
    if (referenceNode) {
        return getReferenceSuggestions(
            referenceNode,
            tokens,
            normalizedCurrent,
        );
    }

    return [];
};
