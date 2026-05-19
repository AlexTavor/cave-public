import { useMemo } from "react";
import type { Suggestion } from "../../../../lib/terminal/types";
import { useShellStore } from "../../shell/shell";
import { useModuleStore } from "../../state/moduleStore";
import { useBlueprintSlice } from "../../state/moduleSession/useBlueprintSlice";
import { useBlueprintContext } from "../blueprint/BlueprintContext";
import {
    COMPARISON_OPERATORS,
    EQUALITY_OPERATORS,
} from "../behaviors/autocomplete/behaviorStateMachine.constants";
import { filterByPrefix } from "../behaviors/autocomplete/behaviorStateMachine.helpers";
import {
    buildRefSuggestions,
    getCursorContext,
    getEntityRoots,
} from "./conditionAutocomplete.utils";

const ALL_OPERATORS = [...COMPARISON_OPERATORS, ...EQUALITY_OPERATORS];
const UNIQUE_OPERATORS = [...new Set(ALL_OPERATORS)];

const makeSuggestions = (
    labels: readonly string[],
    type: Suggestion["type"],
): Suggestion[] => labels.map((label) => ({ label, type, insertText: label }));

/** Position 0 or 2: ref or number value. */
const getRefSuggestions = (
    current: string,
    moduleData: Parameters<typeof buildRefSuggestions>[1],
    draft: Parameters<typeof buildRefSuggestions>[2],
): Suggestion[] => {
    const pathSuggestions = buildRefSuggestions(current, moduleData, draft);
    if (pathSuggestions.length > 0) return pathSuggestions;

    const roots = getEntityRoots(moduleData);
    const filtered = filterByPrefix(roots, current.toLowerCase());
    return makeSuggestions(filtered, "value");
};

export const useConditionAutocomplete = (
    input: string,
    cursor: number,
): Suggestion[] => {
    const { filename, blueprintId } = useBlueprintContext();
    const activeModuleFilename = useShellStore((s) => s.activeModuleFilename);
    const moduleData = useModuleStore((s) =>
        activeModuleFilename ? s.modules[activeModuleFilename] : null,
    );
    const draft = useBlueprintSlice(filename, blueprintId) ?? null;

    return useMemo(() => {
        const { currentToken, tokenIndex } = getCursorContext(input, cursor);

        if (tokenIndex >= 3) return [];

        if (tokenIndex === 0 || tokenIndex === 2) {
            return getRefSuggestions(currentToken, moduleData, draft);
        }

        if (tokenIndex === 1) {
            const filtered = filterByPrefix(UNIQUE_OPERATORS, currentToken);
            return makeSuggestions(filtered, "operator");
        }

        return [];
    }, [cursor, draft, input, moduleData]);
};
