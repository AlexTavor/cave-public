import type {
    DraftOptionBlueprint,
    DraftPoolEntry,
    DraftPoolBlueprint,
} from "../../data/schemas/draft";
import type { ConditionDefinition } from "../../data/schemas/conditions";
import type { RuntimeEntity } from "../../engine/runtime/types";
import type { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { JsonLogicAdapter } from "../../engine/logic/JsonLogicAdapter";
import type { EvaluationContext } from "../../engine/logic/JsonLogicAdapter";
import { buildAssignmentMap } from "../../engine/runtime/systems/behavior/behaviorSystemUtils";
import { evaluateConditionDefinitions } from "../conditions/evaluateConditionDefinitions";
import { resolveConditionRefs } from "../tutorials/resolveConditionRefs";

const normalizeTruthiness = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    return Boolean(value);
};

const buildGlobals = (snapshot: Snapshot): Record<string, number> => {
    const globals: Record<string, number> = { dt: 0, dt_s: 0 };
    const world = snapshot.getEntity("sys_world") as
        | { state?: Record<string, { value?: number }> }
        | undefined;
    const state = world?.state ?? {};
    for (const [key, entry] of Object.entries(state)) {
        if (typeof entry?.value === "number") globals[key] = entry.value;
    }
    return globals;
};

export const filterDraftEntriesByConditions = (params: {
    pool: DraftPoolBlueprint;
    options: Record<string, DraftOptionBlueprint>;
    conditions?: ConditionDefinition[];
    worldEntities: RuntimeEntity[];
    impulseEngine: ImpulseEngine;
    triggerEntityId: string;
    pickedOneOffs?: string[];
}): DraftPoolEntry[] => {
    const snapshot = new Snapshot(params.worldEntities, params.impulseEngine);
    const globals = buildGlobals(snapshot);
    const assignmentMap = buildAssignmentMap(snapshot);
    const triggerEntity =
        snapshot.getEntity(params.triggerEntityId) ??
        snapshot.getEntity("sys_world");

    if (!triggerEntity) return [];

    const conditionIndex = new Map(
        (params.conditions ?? []).map((definition) => [
            definition.id,
            definition,
        ]),
    );
    const self = triggerEntity as RuntimeEntity;
    const context: EvaluationContext = {
        snapshot,
        globals,
        self,
        assignmentMap,
    };

    const adapter = new JsonLogicAdapter();
    const picked = new Set(params.pickedOneOffs ?? []);

    return params.pool.entries.filter((entry) => {
        const option = params.options[entry.optionId];
        if (!option) return false;
        if (option.oneOff && picked.has(option.id)) return false;
        if ((option.conditionIds?.length ?? 0) > 0) {
            const refs = resolveConditionRefs(
                conditionIndex as any,
                option.conditionIds,
            );
            if (refs.missing.length > 0) {
                console.warn(
                    `Draft option '${option.id}' is missing conditions: ${refs.missing.join(", ")}.`,
                );
                return false;
            }
            if (
                !evaluateConditionDefinitions(snapshot, refs.resolved, {
                    defaultSelf: self,
                })
            ) {
                return false;
            }
        }
        if (!option.conditions?.length) return true;
        for (const rule of option.conditions) {
            const result = adapter.evaluate(rule, context, "tier2_entity");
            if (!normalizeTruthiness(result)) return false;
        }
        return true;
    });
};

