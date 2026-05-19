import type { World } from "miniplex";
import type { RuntimeCommand } from "./runtimeCommandUnion";

export type RuntimeStatus = "idle" | "running" | "paused" | "fatal";

export interface RuntimeState {
    tick: number;
    seed: string;
    status: RuntimeStatus;
}

export interface CommandBuffer<TCommand = RuntimeCommand> {
    enqueue: (command: TCommand) => void;
    drain: () => TCommand[];
    clear: () => void;
    size: () => number;
}

export interface RuntimeEntity extends Record<string, unknown> {
    id?: string;
    ledger?: {
        incoming: Record<string, number>;
    };
    tags?: string[];
}

export interface RuntimeModules {
    world: World<RuntimeEntity>;
    commands: CommandBuffer<RuntimeCommand>;
}

