import { useCallback, useMemo } from "react";
import { workspaceService } from "../../../../engine/terminal/commands/projectServices";
import { useSessionStore } from "../../state/useSessionStore";
import {
    useDraftOptionIdSuggestions,
    useDraftPoolIdSuggestions,
} from "../draft/useDraftReferenceSuggestions";
import {
    collectTags,
    uniqueSorted,
} from "./structuredConditionAutocomplete.shared";

const EMPTY_BLUEPRINTS = {};
const EMPTY_TUTORIALS: { id: string }[] = [];
const EMPTY_UNDERSTANDING = {};

export {
    resolveStructuredFactAboutSuggestions,
    STRUCTURED_WORLD_STATE_KEYS,
} from "./structuredConditionAutocomplete.shared";

export const useStructuredConditionBlueprintSuggestions = (
    filename: string,
) => {
    const draftBlueprints = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.draft.blueprints ?? EMPTY_BLUEPRINTS,
            [filename],
        ),
    );
    return useMemo(() => {
        const linked = Object.keys(
            workspaceService.activeCartridge?.blueprints ?? {},
        );
        const drafted = Object.keys(draftBlueprints);
        return [...new Set([...linked, ...drafted])].sort((left, right) =>
            left.localeCompare(right),
        );
    }, [draftBlueprints]);
};

export const useStructuredConditionTutorialSuggestions = (filename: string) => {
    const tutorials = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.draft.config?.settings?.tutorials ??
                EMPTY_TUTORIALS,
            [filename],
        ),
    );
    return useMemo(
        () => uniqueSorted(tutorials.map((item: { id: string }) => item.id)),
        [tutorials],
    );
};

export const useStructuredConditionUnderstandingSuggestions = (
    filename: string,
) => {
    const draftUnderstanding = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.draft.config?.understanding ??
                EMPTY_UNDERSTANDING,
            [filename],
        ),
    );
    return useMemo(
        () =>
            uniqueSorted([
                ...Object.keys(
                    (
                        workspaceService.activeCartridge as unknown as {
                            config?: {
                                understanding?: Record<string, unknown>;
                            };
                        }
                    )?.config?.understanding ?? EMPTY_UNDERSTANDING,
                ),
                ...Object.keys(draftUnderstanding),
            ]),
        [draftUnderstanding],
    );
};

export const useStructuredConditionSuggestions = (filename: string) => {
    const blueprintIds = useStructuredConditionBlueprintSuggestions(filename);
    const tutorialIds = useStructuredConditionTutorialSuggestions(filename);
    const understandingIds =
        useStructuredConditionUnderstandingSuggestions(filename);
    const tagSuggestions = useStructuredConditionTagSuggestions(filename);
    const draftOptionIds = useDraftOptionIdSuggestions(filename);
    const draftPoolIds = useDraftPoolIdSuggestions(filename);
    return {
        blueprintIds,
        tutorialIds,
        understandingIds,
        tagSuggestions,
        draftOptionIds,
        draftPoolIds,
    };
};

export const useStructuredConditionTagSuggestions = (filename: string) => {
    const draftBlueprints = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.draft.blueprints ?? EMPTY_BLUEPRINTS,
            [filename],
        ),
    );
    return useMemo(() => {
        const linked = collectTags(
            workspaceService.activeCartridge?.blueprints ?? {},
        );
        const drafted = collectTags(
            draftBlueprints as Record<string, { tags?: string[] }>,
        );
        return [...new Set([...linked, ...drafted])].sort((left, right) =>
            left.localeCompare(right),
        );
    }, [draftBlueprints]);
};
