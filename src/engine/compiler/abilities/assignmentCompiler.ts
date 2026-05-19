import type { Blueprint } from "../../../data/schemas/blueprint";
import type { AssignmentAbilityConfig } from "../../../data/schemas/abilities/assignment";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { GameValue } from "../../../data/schemas/primitives";
import { prepareAssignmentCompletionTrigger } from "./assignmentCompletionCompiler";
import { createCycleGcRule } from "./cycleCompilerOneOff";

export const assignmentCompiler = (
    draft: Blueprint,
    config: AssignmentAbilityConfig,
    fullAbilities?: EditorAbilities,
): void => {
    const results = config.results ?? [];
    const processingOutputs = results.flatMap((result) =>
        result.type === "spawn_resource"
            ? [
                  {
                      resource: result.resource,
                      source: result.source,
                      ...(result.attribute
                          ? { attribute: result.attribute }
                          : {}),
                      factor: result.factor ?? 1,
                      target: result.target ?? "sys_world",
                  },
              ]
            : [],
    );
    draft.components ??= {} as Blueprint["components"];
    draft.components.assignment = {
        slots: config.slots,
        locking: config.locking,
        filter: config.filter,
        minimums: config.minimums,
        assignedIds: [],
    };

    draft.components.state ??= {};
    prepareAssignmentCompletionTrigger(draft);

    if (config.duration > 0) {
        draft.components.state.absorption_duration = {
            value: config.duration,
            visible: false,
        };
    }

    if (processingOutputs.length > 0) {
        draft.components.state.processing_outputs = {
            value: processingOutputs as unknown as GameValue,
            visible: false,
        };
    }

    if (results.some((result) => result.type === "transfer_habiti")) {
        draft.components.state.processing_absorbs_habiti = {
            value: true,
            visible: false,
        };
    }

    if (results.some((result) => result.type === "destroy_assigned_bodies")) {
        draft.components.state.processing_destroys_assigned_bodies = {
            value: true,
            visible: false,
        };
    }

    if (config.oneOff) {
        draft.components.state.is_depleted ??= { value: 0, visible: false };
        draft.components.behavior ??= { rules: [] };
        draft.components.behavior.rules ??= [];
        if (
            !draft.components.behavior.rules.some(
                (rule) => rule.id === "sys_cycle_gc",
            )
        ) {
            draft.components.behavior.rules.push(
                createCycleGcRule(fullAbilities?.storage),
            );
        }
    }
};

