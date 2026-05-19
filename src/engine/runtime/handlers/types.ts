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

export interface CommandHandlerContext {
    world: World<RuntimeEntity>;
    cartridge: ModuleCartridge;
    impulseEngine: ImpulseEngine;
    executeCommand?: (command: string) => void;
    commands?: CommandBuffer<RuntimeCommand>;
    markEntityListDirty: () => void;
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

