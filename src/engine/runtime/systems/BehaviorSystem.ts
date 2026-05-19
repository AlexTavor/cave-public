import type { CommandBuffer, RuntimeCommand, RuntimeEntity } from "../types";
import { RuntimeCommandType } from "../types";
import type { Snapshot } from "../Snapshot";
import {
    JsonLogicAdapter,
    type EvaluationContext,
} from "../../logic/JsonLogicAdapter";
import type {
    BehaviorComponent,
    BehaviorRule,
} from "../../../data/schemas/behavior";
import { ActionExecutor } from "./behavior/ActionExecutor";
import type { BehaviorContext } from "./behavior/ValueResolver";
import {
    buildAssignmentMap,
    normalizeTruthiness,
    updateGlobalsBuffer,
} from "./behavior/behaviorSystemUtils";

export class BehaviorSystem {
    private readonly adapter: JsonLogicAdapter;
    private readonly executor: ActionExecutor;
    private readonly context: Partial<EvaluationContext> = {};
    private readonly globalsBuffer: Record<string, number> = {};

    constructor(adapter?: JsonLogicAdapter, executor?: ActionExecutor) {
        this.adapter = adapter ?? new JsonLogicAdapter();
        this.executor = executor ?? new ActionExecutor();
    }

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): void {
        updateGlobalsBuffer(this.globalsBuffer, snapshot, dt);
        const assignmentMap = buildAssignmentMap(snapshot);
        this.context.snapshot = snapshot;
        this.context.globals = this.globalsBuffer;
        this.context.assignmentMap = assignmentMap;

        for (const entity of snapshot.getEntities()) {
            const blueprintId =
                typeof entity.blueprintId === "string"
                    ? entity.blueprintId
                    : undefined;
            const behavior =
                (entity as RuntimeEntity & { behavior?: BehaviorComponent })
                    .behavior ??
                (blueprintId
                    ? snapshot.getBlueprint(blueprintId)?.components?.behavior
                    : undefined);
            if (!behavior?.rules?.length) continue;

            const behaviorContext: BehaviorContext = {
                snapshot,
                globals: this.globalsBuffer,
                self: entity as RuntimeEntity,
                sourceLane: "behavior_rule",
                assignmentMap,
            };

            this.context.self = entity as RuntimeEntity;

            for (const rule of behavior.rules) {
                if (!this.shouldRunRule(rule)) continue;
                for (const action of rule.actions) {
                    this.executeAction(
                        action,
                        entity,
                        behaviorContext,
                        commands,
                    );
                }
            }
        }
    }

    private executeAction(
        action: BehaviorComponent["rules"][number]["actions"][number],
        entity: RuntimeEntity,
        behaviorContext: BehaviorContext,
        commands: CommandBuffer<RuntimeCommand>,
    ): void {
        if (action.type !== "TRIGGER_DRAFT") {
            this.executor.execute(action, behaviorContext, commands);
            return;
        }

        const triggerRef = action.triggerEntityId ?? "self";
        const triggerEntityId =
            triggerRef === "self" ? (entity.id ?? "sys_world") : triggerRef;
        commands.enqueue({
            type: RuntimeCommandType.TRIGGER_DRAFT,
            payload: {
                poolId: action.poolId,
                triggerEntityId,
                count: action.count,
                label: action.label,
                ...(action.onComplete === undefined
                    ? {}
                    : { onComplete: action.onComplete }),
            },
        });
    }

    private shouldRunRule(rule: BehaviorRule): boolean {
        if (!rule.conditions?.length) return true;
        for (const condition of rule.conditions) {
            const result = this.adapter.evaluate(
                condition,
                this.context as EvaluationContext,
                "tier2_entity",
            );
            if (!normalizeTruthiness(result)) return false;
        }
        return true;
    }
}

