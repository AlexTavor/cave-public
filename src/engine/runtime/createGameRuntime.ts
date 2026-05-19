import type { ModuleCartridge } from "../../data/schemas/module";
import { CommandsManager } from "./CommandsManager";
import { AutomationSpawnHandler } from "./handlers/AutomationSpawnHandler";
import { CancelTransferHandler } from "./handlers/CancelTransferHandler";
import { ExecuteAutomationHandler } from "./handlers/ExecuteAutomationHandler";
import { KillHandler } from "./handlers/KillHandler";
import { PatchBlueprintHandler } from "./handlers/PatchBlueprintHandler";
import { PositionHandler } from "./handlers/PositionHandler";
import { ResolveTransferHandler } from "./handlers/ResolveTransferHandler";
import { SetGlobalHandler } from "./handlers/SetGlobalHandler";
import { SpawnHandler } from "./handlers/SpawnHandler";
import { TransferHandler } from "./handlers/TransferHandler";
import { UpdateStateHandler } from "./handlers/UpdateStateHandler";
import { AdjustStateHandler } from "./handlers/AdjustStateHandler";
import { UpdateAutomationHandler } from "./handlers/UpdateAutomationHandler";
import { UpdatePowerSinkHandler } from "./handlers/UpdatePowerSinkHandler";
import { UpdateCaveHandler } from "./handlers/UpdateCaveHandler";
import { UpdateAssignmentHandler } from "./handlers/UpdateAssignmentHandler";
import { SetPhysicsLayerHandler } from "./handlers/SetPhysicsLayerHandler";
import { ShowCinematicHandler } from "./handlers/ShowCinematicHandler";
import { Runtime } from "./Runtime";

import type { RuntimeTelemetryAdapter } from "./RuntimeTelemetry";
export type { RuntimeTelemetryAdapter } from "./RuntimeTelemetry";

export const createGameRuntime = (
  cartridge: ModuleCartridge,
  seed: string,
  telemetry?: RuntimeTelemetryAdapter,
  executeCommand?: (command: string) => void,
): Runtime => {
  const commandsManager = new CommandsManager();
  commandsManager.registerHandler(new SpawnHandler());
  commandsManager.registerHandler(new AutomationSpawnHandler());
  commandsManager.registerHandler(new KillHandler());
  commandsManager.registerHandler(new TransferHandler());
  commandsManager.registerHandler(new ResolveTransferHandler());
  commandsManager.registerHandler(new CancelTransferHandler());
  commandsManager.registerHandler(new PatchBlueprintHandler());
  commandsManager.registerHandler(new PositionHandler());
  commandsManager.registerHandler(new SetGlobalHandler());
  commandsManager.registerHandler(new UpdateStateHandler());
  commandsManager.registerHandler(new AdjustStateHandler());
  commandsManager.registerHandler(new UpdateAutomationHandler());
  commandsManager.registerHandler(new ExecuteAutomationHandler());
  commandsManager.registerHandler(new UpdatePowerSinkHandler());
  commandsManager.registerHandler(new UpdateCaveHandler());
  commandsManager.registerHandler(new UpdateAssignmentHandler());
  commandsManager.registerHandler(new SetPhysicsLayerHandler());
  commandsManager.registerHandler(new ShowCinematicHandler());

  return new Runtime(
    cartridge,
    seed,
    commandsManager,
    telemetry,
    executeCommand,
  );
};
