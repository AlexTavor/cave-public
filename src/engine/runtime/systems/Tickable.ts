import type { Snapshot } from "../Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../types";

export interface Tickable<TResult> {
    tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): TResult;
}
