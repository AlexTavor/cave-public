import type { ConditionDefinition } from "../../data/schemas/conditions";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { evaluateStructuredConditionSet } from "./evaluateStructuredConditionSet";

const resolveTaggedSelf = (snapshot: Snapshot, tag: string) => {
    let resolved: RuntimeEntity | null = null;
    snapshot.query({ tag }).forEach((entity) => {
        if (!entity.id) return;
        if (!resolved || entity.id.localeCompare(resolved.id ?? "") < 0) {
            resolved = entity as RuntimeEntity;
        }
    });
    return resolved;
};

const resolveConditionSelf = (input: {
    snapshot: Snapshot;
    definition: ConditionDefinition;
    overrideSelf?: RuntimeEntity | null;
    defaultSelf?: RuntimeEntity | null;
}) => {
    if (input.overrideSelf) return input.overrideSelf;
    const world = input.snapshot.getEntity("sys_world") as RuntimeEntity | null;
    const selfDefinition = input.definition.selfDefinition ?? { kind: "auto" };
    switch (selfDefinition.kind) {
        case "auto":
            return input.defaultSelf ?? world;
        case "entity_id":
            return (
                (input.snapshot.getEntity(
                    selfDefinition.entityId,
                ) as RuntimeEntity) ?? null
            );
        case "entity_tag":
        case "spawned_with_tag":
            return resolveTaggedSelf(input.snapshot, selfDefinition.tag);
    }
};

export const evaluateConditionDefinitions = (
    snapshot: Snapshot,
    definitions: ConditionDefinition[],
    options: {
        overrideSelf?: RuntimeEntity | null;
        defaultSelf?: RuntimeEntity | null;
    } = {},
): boolean => {
    for (const definition of definitions) {
        if (definition.conditions.length === 0) continue;
        const self = resolveConditionSelf({
            snapshot,
            definition,
            overrideSelf: options.overrideSelf,
            defaultSelf: options.defaultSelf,
        });
        if (!self) return false;
        if (
            !evaluateStructuredConditionSet(
                snapshot,
                definition.conditions,
                self,
            )
        ) {
            return false;
        }
    }
    return true;
};
