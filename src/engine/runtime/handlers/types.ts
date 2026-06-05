import type { World } from "miniplex";
import type { ModuleCartridge } from "../../../data/schemas/module";
import type { ImpulseEngine } from "../../physics/impulse/ImpulseEngine";
import type {
    CommandBuffer,
    RuntimeEntity,
    RuntimeCommand,
    RuntimeCommandType,
} from "../types";

import type { Snapshot } from "../Snapshot";
import type { BodyHabitiAssigner } from "./bodyHabitiAssigner";

export interface CommandHandlerContext {
    world: World<RuntimeEntity>;
    cartridge: ModuleCartridge;
    impulseEngine: ImpulseEngine;
    executeCommand?: (command: string) => void;
    commands?: CommandBuffer<RuntimeCommand>;
    markEntityListDirty: () => void;
    /**
     * Game-injected habiti algorithm (see bodyHabitiAssigner). Set per-runtime
     * via Runtime.setBodyHabitiAssigner at game wire-time; undefined on
     * engine-only contexts that never spawn habiti-bearing bodies.
     */
    assignBodyHabiti?: BodyHabitiAssigner;
    telemetry: {
        log: (channel: "tick" | "systems" | "errors", message: string) => void;
        onCommandsApplied?: (
            commands: RuntimeCommand[],
            previousSnapshot: Snapshot,
            currentSnapshot: Snapshot,
        ) => void;
    };
}

export interface CommandHandler<T extends RuntimeCommand> {
    readonly type: RuntimeCommandType;
    handle: (command: T, context: CommandHandlerContext) => void;
}

