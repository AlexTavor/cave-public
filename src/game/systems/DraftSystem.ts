import type { DraftComponent } from "../../engine/runtime/components/DraftComponent";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { System } from "../../engine/runtime/systems/System";
import { ActionExecutor } from "../../engine/runtime/systems/behavior/ActionExecutor";
import type { BehaviorContext } from "../../engine/runtime/systems/behavior/ValueResolver";

const buildGlobals = (
    snapshot: Snapshot,
    dt: number,
): Record<string, number> => {
    const globals: Record<string, number> = { dt, dt_s: dt / 1000 };
    const world = snapshot.getEntity("sys_world") as
        | { state?: Record<string, { value?: number }> }
        | undefined;
    const state = world?.state ?? {};
    for (const [key, entry] of Object.entries(state)) {
        if (typeof entry?.value === "number") {
            globals[key] = entry.value;
        }
    }
    return globals;
};

const enqueueLevelUpSpend = (
    world: RuntimeEntity | undefined,
    draft: DraftComponent,
    commands: CommandBuffer<RuntimeCommand>,
) => {
    if (draft.poolId !== "pool_level_up") return;
    const skillpoints = (world as any)?.cave?.progression?.skillpoints;
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_CAVE,
        payload: {
            entityId: "sys_world",
            skillpoints:
                typeof skillpoints === "number"
                    ? Math.max(0, skillpoints - 1)
                    : 0,
        },
    });
};

export class DraftSystem implements System {
    public readonly runsWhenPaused = true;
    private readonly executor: ActionExecutor;

    constructor(executor?: ActionExecutor) {
        this.executor = executor ?? new ActionExecutor();
    }

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): void {
        const world = snapshot.getEntity("sys_world") as
            | (RuntimeEntity & { draft?: DraftComponent })
            | undefined;
        const draft = world?.draft;
        if (!draft?.selectedOptionId) return;

        const option = draft.options.find(
            (entry) => entry.id === draft.selectedOptionId,
        );
        if (!option) {
            commands.enqueue({
                type: RuntimeCommandType.CLEAR_DRAFT,
                payload: {},
            });
            return;
        }

        const self = snapshot.getEntity(draft.triggerEntityId);
        if (!self) {
            commands.enqueue({
                type: RuntimeCommandType.CLEAR_DRAFT,
                payload: {},
            });
            return;
        }

        const context: BehaviorContext = {
            snapshot,
            globals: buildGlobals(snapshot, dt),
            self: self as RuntimeEntity,
            sourceLane: "draft_option",
        };

        for (const action of option.payload) {
            this.executor.execute(action, context, commands);
        }

        enqueueLevelUpSpend(world, draft, commands);

        commands.enqueue({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "run",
                factType: "draft_completed",
                factAbout: option.id,
                delta: 1,
            },
        });
        commands.enqueue({
            type: RuntimeCommandType.CLEAR_DRAFT,
            payload: {},
        });
    }
}

