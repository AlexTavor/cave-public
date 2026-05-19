import type { ConditionDefinition } from "../../data/schemas/conditions";
import type { TutorialComponent } from "../../data/schemas/components/tutorial";
import type { GuidanceDefinition } from "../../data/schemas/guidances";
import type { TutorialDefinition } from "../../data/schemas/tutorials";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateTutorialCandidate } from "./evaluateTutorialCandidate";
import { readPermanentTutorialCompletion } from "./hardTutorialSystemUtils";
import type { TutorialCompletion } from "./tutorialCompletion";

type CandidateSelection =
    | { kind: "complete"; completion: TutorialCompletion }
    | { kind: "pick"; rank: number; state: TutorialComponent };

const readCandidateRank = (
    tutorial: TutorialDefinition,
    state: TutorialComponent,
) =>
    (tutorial.enterConditionIds?.length ?? 0) > 0 ||
    state.bindings.some((binding) => binding.targetOptionId != null)
        ? 2
        : 1;

export const resolveTutorialCandidateSelection = (input: {
    snapshot: Snapshot;
    tutorial: TutorialDefinition;
    guidanceIndex: Map<string, GuidanceDefinition>;
    conditionIndex: Map<string, ConditionDefinition>;
    continuingTutorialId: string | null;
}): CandidateSelection | null => {
    const candidate = evaluateTutorialCandidate(
        input.snapshot,
        input.tutorial,
        input.guidanceIndex,
        input.conditionIndex,
    );
    if (candidate.kind === "skip") return null;
    if (candidate.kind === "invalid")
        return {
            kind: "complete",
            completion: {
                kind: "invalid",
                tutorialId: input.tutorial.id,
                error: candidate.error,
            },
        };
    if (candidate.state.tutorialId === input.continuingTutorialId) return null;
    return {
        kind: "pick",
        state: candidate.state,
        rank: readCandidateRank(input.tutorial, candidate.state),
    };
};

const shouldSkipTutorial = (
    completed: ReadonlySet<string>,
    snapshot: Snapshot,
    tutorialId: string,
) =>
    completed.has(tutorialId) ||
    readPermanentTutorialCompletion(snapshot, tutorialId) > 0;

export const resolveQueuedTutorialState = (input: {
    snapshot: Snapshot;
    tutorials: TutorialDefinition[];
    guidanceIndex: Map<string, GuidanceDefinition>;
    conditionIndex: Map<string, ConditionDefinition>;
    completed: ReadonlySet<string>;
    continuingTutorialId: string | null;
    nextState: TutorialComponent;
    complete: (completion: TutorialCompletion) => void;
}) => {
    let nextRank = input.nextState.active ? 1 : 0;
    let nextState = input.nextState;
    for (const tutorial of input.tutorials) {
        if (shouldSkipTutorial(input.completed, input.snapshot, tutorial.id))
            continue;
        const selection = resolveTutorialCandidateSelection({
            snapshot: input.snapshot,
            tutorial,
            guidanceIndex: input.guidanceIndex,
            conditionIndex: input.conditionIndex,
            continuingTutorialId: input.continuingTutorialId,
        });
        if (!selection) continue;
        if (selection.kind === "complete") {
            input.complete(selection.completion);
            continue;
        }
        if (selection.rank < nextRank) continue;
        if (selection.rank === nextRank && selection.rank === 1) continue;
        nextState = selection.state;
        nextRank = selection.rank;
    }
    return nextState;
};
