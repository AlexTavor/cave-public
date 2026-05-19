import type { ConditionDefinition } from "../../data/schemas/conditions";
import type { GuidanceDefinition } from "../../data/schemas/guidances";
import type { TutorialDefinition } from "../../data/schemas/tutorials";
import type { System } from "../../engine/runtime/systems/System";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import {
    RuntimeCommandType,
    type CommandBuffer,
    type RuntimeCommand,
} from "../../engine/runtime/types";
import { executeBehaviorActionList } from "../handlers/executeBehaviorActionList";
import { resolveTutorialTickState } from "./resolveTutorialTickState";

const buildGuidanceIndex = (guidances: GuidanceDefinition[]) =>
    new Map(guidances.map((item) => [item.id, item]));

const buildConditionIndex = (conditions: ConditionDefinition[]) =>
    new Map(conditions.map((item) => [item.id, item]));

const buildTutorialIndex = (tutorials: TutorialDefinition[]) =>
    new Map(tutorials.map((item) => [item.id, item]));

const resolveCompletionSelf = (snapshot: Snapshot, selfId: string) =>
    snapshot.getEntity(selfId) ?? snapshot.getEntity("sys_world");

const enqueueTutorialCommands = (
    commands: CommandBuffer<RuntimeCommand>,
    snapshot: Snapshot,
    tutorialIndex: Map<string, TutorialDefinition>,
    tutorial: ReturnType<typeof resolveTutorialTickState>,
) => {
    commands.enqueue({
        type: RuntimeCommandType.SET_TUTORIAL_STATE,
        payload: { tutorial: tutorial.nextState },
    });
    tutorial.completions.forEach((completion) => {
        commands.enqueue({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "permanent",
                factType: "tutorial_completed",
                factAbout: completion.tutorialId,
                delta: 1,
            },
        });
        if (completion.kind !== "completed") return;
        const actions =
            tutorialIndex.get(completion.tutorialId)?.onComplete ?? [];
        const self = resolveCompletionSelf(snapshot, completion.selfId) as any;
        if (actions.length === 0 || !self) return;
        executeBehaviorActionList({
            actions,
            self,
            snapshot,
            commands,
            sourceLane: "tutorial_on_complete",
        });
    });
};

export class HardTutorialSystem implements System {
    public readonly runsWhenPaused = true;

    constructor(
        private readonly getConditions: () => ConditionDefinition[],
        private readonly getGuidances: () => GuidanceDefinition[],
        private readonly getTutorials: () => TutorialDefinition[],
    ) {}

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        const tutorials = this.getTutorials();
        enqueueTutorialCommands(
            commands,
            snapshot,
            buildTutorialIndex(tutorials),
            resolveTutorialTickState({
                snapshot,
                tutorials,
                guidanceIndex: buildGuidanceIndex(this.getGuidances()),
                conditionIndex: buildConditionIndex(this.getConditions()),
            }),
        );
    }
}
