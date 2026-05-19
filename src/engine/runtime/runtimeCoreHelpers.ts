import type { ModuleCartridge } from "../../data/schemas/module";
import type { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { RuntimeTelemetryAdapter } from "./RuntimeTelemetry";
import type { CommandHandlerContext } from "./handlers/types";
import type { Snapshot } from "./Snapshot";
import type { CommandBuffer, RuntimeCommand } from "./types";
import { buildTelemetryContext } from "./runtimeTelemetryContext";
import { updateSnapshotBuffers } from "./runtimeSnapshotBuffers";
import type { PhaseContext } from "./runtimePhaseTypes";
import type { RuntimeEntityStore } from "./RuntimeEntityStore";

export const createCommandHandlerContext = (
  entityStore: RuntimeEntityStore,
  cartridge: ModuleCartridge,
  impulseEngine: ImpulseEngine,
  commands: CommandBuffer<RuntimeCommand>,
  telemetry?: RuntimeTelemetryAdapter,
  executeCommand?: (command: string) => void,
): CommandHandlerContext => ({
  world: entityStore.getCommandWorld(),
  cartridge,
  impulseEngine,
  executeCommand,
  commands,
  markEntityListDirty: () => entityStore.markDirty(),
  telemetry: buildTelemetryContext(telemetry),
});

export const buildRuntimeSnapshot = (
  context: PhaseContext,
  activeSnapshotBuffer: number,
  snapshotBuffers: [Snapshot | null, Snapshot | null],
) => updateSnapshotBuffers(context, activeSnapshotBuffer, snapshotBuffers);
