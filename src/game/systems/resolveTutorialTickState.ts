import type { ConditionDefinition } from "../../data/schemas/conditions";
import type { TutorialComponent } from "../../data/schemas/components/tutorial";
import type { GuidanceDefinition } from "../../data/schemas/guidances";
import type { TutorialDefinition } from "../../data/schemas/tutorials";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import { getTutorialComponent } from "../tutorials/tutorialStateUtils";
import {
    clearTutorialState,
    resolveActiveTutorialOutcome,
} from "./hardTutorialSystemUtils";
import { resolveQueuedTutorialState } from "./resolveTutorialCandidateSelection";
import type { TutorialCompletion } from "./tutorialCompletion";

const resolveContinuingTutorialState = (input: {
    snapshot: Snapshot;
    tutorials: TutorialDefinition[];
    guidanceIndex: Map<string, GuidanceDefinition>;
    conditionIndex: Map<string, ConditionDefinition>;
    active: TutorialComponent;
}) => {
    if (!input.active.active || !input.active.tutorialId) return null;
    const current = input.tutorials.find(
        (item) => item.id === input.active.tutorialId,
    );
    if (!current) {
        return {
            completion: {
                kind: "invalid",
                tutorialId: input.active.tutorialId,
                error: `Tutorial '${input.active.tutorialId}' is active but missing from authored config.`,
            } as TutorialCompletion,
        };
    }
    const outcome = resolveActiveTutorialOutcome(
        input.snapshot,
        current,
        input.active,
        input.guidanceIndex,
        input.conditionIndex,
    );
    return outcome.kind === "continue"
        ? { nextState: input.active }
        : {
              completion: outcome.error
                  ? ({
                        kind: "invalid",
                        tutorialId: current.id,
                        error: outcome.error,
                    } as TutorialCompletion)
                  : ({
                        kind: "completed",
                        tutorialId: current.id,
                        selfId: input.active.selfId as string,
                    } as TutorialCompletion),
          };
};

export const resolveTutorialTickState = (input: {
    snapshot: Snapshot;
    tutorials: TutorialDefinition[];
    guidanceIndex: Map<string, GuidanceDefinition>;
    conditionIndex: Map<string, ConditionDefinition>;
}) => {
    const active = getTutorialComponent(
        input.snapshot.getEntity("sys_world") as any,
    );
    const completed = new Set<string>();
    const completions: TutorialCompletion[] = [];
    let nextState: TutorialComponent = clearTutorialState();
    const complete = (completion: TutorialCompletion) => {
        if (completed.has(completion.tutorialId)) return;
        if (completion.kind === "invalid") console.error(completion.error);
        completed.add(completion.tutorialId);
        completions.push(completion);
    };

    const activeState = resolveContinuingTutorialState({
        snapshot: input.snapshot,
        tutorials: input.tutorials,
        guidanceIndex: input.guidanceIndex,
        conditionIndex: input.conditionIndex,
        active,
    });
    if (activeState?.nextState) nextState = activeState.nextState;
    if (activeState?.completion) {
        complete(activeState.completion);
    }
    nextState = resolveQueuedTutorialState({
        snapshot: input.snapshot,
        tutorials: input.tutorials,
        guidanceIndex: input.guidanceIndex,
        conditionIndex: input.conditionIndex,
        completed,
        continuingTutorialId: activeState?.nextState?.tutorialId ?? null,
        nextState,
        complete,
    });

    return { completions, nextState };
};
