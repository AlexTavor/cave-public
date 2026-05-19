import type { Command } from "./runtimeCommandBase";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type { SpawnCarrierCommandPayload } from "./runtimeCommandPayloads";

export type SpawnCarrierCommand = Command<
    RuntimeCommandType.SPAWN_CARRIER,
    SpawnCarrierCommandPayload
>;
