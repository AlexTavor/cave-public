import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BehaviorRule } from "../../../data/schemas/behavior";
import type { SpawnerAbilityConfig } from "../../../data/schemas/abilities/spawner";
import type { ConditionalActivationAbilityValue } from "../../../data/schemas/abilities/conditionalActivation";
import { compileStructuredConditionAllGate } from "../conditions/compileStructuredConditions";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";
import { appendConditionalActivationActiveStates } from "./conditionalActivationCompiler";
import { requiresCycleTrigger } from "./requiresCycleTrigger";

const buildSpawnExtras = (params: {
    parentOnSpawn: SpawnerAbilityConfig["parentOnSpawn"];
    forcedHabiti: string[];
}) => ({
    ...(params.parentOnSpawn === "self" ? { parentId: "self" } : {}),
    ...(params.forcedHabiti.length > 0
        ? { forcedHabiti: params.forcedHabiti }
        : {}),
});

const createSpawnerRule = (params: {
    blueprintId: string;
    mode: SpawnerAbilityConfig["mode"];
    target: string;
    count: number;
    index: number;
    triggers: NonNullable<SpawnerAbilityConfig["triggers"]>;
    parentOnSpawn: SpawnerAbilityConfig["parentOnSpawn"];
    forcedHabiti: string[];
}): BehaviorRule => {
    const actions: BehaviorRule["actions"] = Array.from(
        { length: params.count },
        () =>
            params.mode === "spawn"
                ? {
                      type: "SPAWN" as const,
                      blueprintId: params.blueprintId,
                      ...buildSpawnExtras(params),
                  }
                : {
                      type: "SPAWN_BODY" as const,
                      blueprintId: params.blueprintId,
                      target: params.target,
                      ...buildSpawnExtras(params),
                  },
    );

    return {
        id: `sys_spawner_${params.blueprintId}_${params.index}`,
        sortKey: "sys_070",
        conditions: buildAbilityTriggerConditions(params.triggers),
        actions,
    };
};

export const spawnerCompiler = (
    draft: Blueprint,
    config: SpawnerAbilityConfig,
    index: number,
    conditionalActivation?: ConditionalActivationAbilityValue,
): void => {
    const blueprintId = config.blueprintId?.trim();
    const triggers = config.triggers ?? ["cycle_complete"];
    const forcedHabiti = config.forcedHabiti ?? [];
    if (!blueprintId) {
        console.warn(`Spawner ability missing blueprintId on '${draft.id}'.`);
        return;
    }

    if (requiresCycleTrigger(triggers) && !draft.components?.state?.cycle) {
        console.warn(`Spawner ability requires cycle on '${draft.id}'.`);
    }

    const countValue = config.count?.base ?? 1;
    const count = Math.max(0, Math.floor(countValue));
    if (count === 0) return;

    draft.components ??= {} as Blueprint["components"];
    draft.components.behavior ??= { rules: [] };
    draft.components.behavior.rules ??= [];
    const rule = createSpawnerRule({
        blueprintId,
        mode: config.mode ?? "spawn_body",
        target: config.target ?? "sys_world",
        count,
        index,
        triggers,
        parentOnSpawn: config.parentOnSpawn ?? "none",
        forcedHabiti,
    });
    const conditionGate = compileStructuredConditionAllGate(
        config.conditions ?? [],
    );
    if (conditionGate) {
        rule.conditions.push(conditionGate);
    }
    appendConditionalActivationActiveStates(rule, conditionalActivation, {
        ability: "spawner",
        targetId: config.id,
    });
    draft.components.behavior.rules.push(rule);
};

