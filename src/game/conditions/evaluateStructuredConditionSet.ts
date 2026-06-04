import {
    JsonLogicAdapter,
    type EvaluationContext,
} from "../../engine/logic/JsonLogicAdapter";
import { compileStructuredConditionAllGate } from "../../engine/compiler/conditions/compileStructuredConditions";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";
import type { StructuredConditionInput } from "../../data/schemas/conditions";
import { registerGameLogicOps } from "../logic/registerGameLogicOps";

const buildGlobals = (world?: RuntimeEntity): Record<string, number> => {
    const globals: Record<string, number> = { dt: 0, dt_s: 0 };
    const state = (world?.state as Record<string, { value?: number }>) ?? {};
    Object.entries(state).forEach(([key, entry]) => {
        if (typeof entry?.value === "number") globals[key] = entry.value;
    });
    return globals;
};

const isTrue = (value: number | boolean) =>
    typeof value === "number" ? value > 0 : Boolean(value);

export const evaluateStructuredConditionSet = (
    snapshot: Snapshot,
    conditions: StructuredConditionInput[],
    self?: RuntimeEntity | null,
): boolean => {
    // Structured conditions can compile to game-domain ops (CARRIERS_ORBITING,
    // etc.); ensure they're registered even when this is called outside a fully
    // wired game runtime (idempotent).
    registerGameLogicOps();
    const gate = compileStructuredConditionAllGate(conditions);
    if (!gate) return true;

    const world = snapshot.getEntity("sys_world") as RuntimeEntity | undefined;
    const context: EvaluationContext = {
        snapshot,
        globals: buildGlobals(world),
        self: self ?? world,
    };

    return isTrue(
        new JsonLogicAdapter().evaluate(gate, context, "tier1_world"),
    );
};
