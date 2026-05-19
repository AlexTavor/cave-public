import type { World } from "miniplex";
import type { CommandHandlerContext } from "./handlers/types";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
    RuntimeState,
} from "./types";
import type { CommandsManager } from "./CommandsManager";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { Blueprint } from "../../data/schemas/blueprint";
import type {
    AutomationSystem,
    AutomationSnapshot,
} from "./systems/AutomationSystem";
import type { BehaviorSystem } from "./systems/BehaviorSystem";
import type { System } from "./systems/System";

export interface PhaseSystems {
    behaviorSystem: BehaviorSystem;
    automationSystem: AutomationSystem;
    preBehaviorSystems: System[];
    registeredSystems: System[];
}

export interface PhaseContext {
    world: World<RuntimeEntity>;
    commandsManager: CommandsManager;
    commands: CommandBuffer<RuntimeCommand>;
    impulseEngine: ImpulseEngine;
    commandContext: CommandHandlerContext;
    state: RuntimeState;
    blueprints: Record<string, Blueprint>;
    getSortedEntities: () => ReadonlyArray<RuntimeEntity>;
    systems: PhaseSystems;
}

export interface PhaseResults {
    nextAutomationSnapshot: AutomationSnapshot;
}

