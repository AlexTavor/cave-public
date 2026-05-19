import type { Snapshot } from "../runtime/Snapshot";
import type { RuntimeEntity } from "../runtime/types";

export type LogicMode = "tier1_world" | "tier2_entity";

export interface EvaluationContext {
    snapshot: Snapshot;
    self?: RuntimeEntity;
    globals: Record<string, number>;
    slots?: Record<string, RuntimeEntity[]>;
    assignmentMap?: Record<string, string>;
}
