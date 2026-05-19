import { useCallback, useMemo, useState } from "react";
import type { BehaviorItem } from "../behaviors/types";
import { useSessionStore } from "../../state/useSessionStore";
import { compileBehaviorRule, tokenizeSentence } from "../behaviors/compiler";
import { buildBehaviorItems } from "./entityBehaviorUtils";
import {
    applyBehaviorAdd,
    applyBehaviorRemoval,
} from "./entityBehaviorMutators";
import { useBlueprintContext } from "../blueprint/BlueprintContext";
import { useBlueprintSlice } from "../../state/moduleSession/useBlueprintSlice";
import type { BehaviorRule } from "../../../../data/schemas/behavior";

interface UseEntityBehaviorsResult {
    behaviors: BehaviorItem[];
    addBehavior: (sentence: string) => void;
    removeBehavior: (item: BehaviorItem) => void;
    updateBehavior: (item: BehaviorItem, sentence: string) => void;
    error: string | null;
}

export const useEntityBehaviors = (): UseEntityBehaviorsResult => {
    const [error, setError] = useState<string | null>(null);
    const { filename, blueprintId } = useBlueprintContext();

    const updateDraft = useSessionStore((s) => s.updateDraft);
    const components = useBlueprintSlice(filename, blueprintId)?.components;

    const behaviors = useMemo(
        () => buildBehaviorItems(components),
        [components],
    );

    const addBehavior = useCallback(
        (sentence: string) => {
            setError(null);
            const tokens = tokenizeSentence(sentence);
            if (tokens.length === 0) return;

            try {
                updateDraft(filename, (moduleDraft) => {
                    const blueprint = moduleDraft.blueprints[blueprintId];
                    if (!blueprint) return;
                    applyBehaviorAdd(blueprint, tokens);
                });
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Unable to compile behavior.";
                setError(message);
            }
        },
        [filename, blueprintId, updateDraft],
    );

    const removeBehavior = useCallback(
        (item: BehaviorItem) => {
            updateDraft(filename, (moduleDraft) => {
                const blueprint = moduleDraft.blueprints[blueprintId];
                if (!blueprint) return;
                applyBehaviorRemoval(blueprint, item);
            });
        },
        [filename, blueprintId, updateDraft],
    );

    const updateBehavior = useCallback(
        (item: BehaviorItem, sentence: string) => {
            setError(null);
            const tokens = tokenizeSentence(sentence);
            if (tokens.length === 0) return;

            try {
                updateDraft(filename, (moduleDraft) => {
                    const blueprint = moduleDraft.blueprints[blueprintId];
                    if (!blueprint) return;
                    const behavior = blueprint.components?.behavior;
                    const rules = behavior?.rules ?? [];
                    const index = rules.findIndex(
                        (rule: BehaviorRule) => rule.id === item.source.ruleId,
                    );
                    if (index < 0 || !behavior) return;

                    const nextRule = compileBehaviorRule(tokens);
                    const existing = rules[index];
                    nextRule.id = item.source.ruleId;
                    if (existing?.sortKey) {
                        nextRule.sortKey = existing.sortKey;
                    }

                    behavior.rules = [
                        ...rules.slice(0, index),
                        nextRule,
                        ...rules.slice(index + 1),
                    ];
                });
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Unable to compile behavior.";
                setError(message);
            }
        },
        [filename, blueprintId, updateDraft],
    );

    return {
        behaviors,
        addBehavior,
        removeBehavior,
        updateBehavior,
        error,
    };
};
