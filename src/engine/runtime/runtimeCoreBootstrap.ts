import type { ModuleCartridge } from "../../data/schemas/module";
import { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import type { CommandsManager } from "./CommandsManager";
import type { RuntimeTelemetryAdapter } from "./RuntimeTelemetry";
import type { CommandHandlerContext } from "./handlers/types";
import { RuntimeEntityStore } from "./RuntimeEntityStore";
import { RuntimeSystemsRegistry } from "./RuntimeSystemsRegistry";
import { resolveImpulseConfig } from "./runtimeImpulseConfig";
import { createCommandHandlerContext } from "./runtimeCoreHelpers";
import { resetRuntimeCoreState } from "./runtimeCoreState";

export const createRuntimeCoreBootstrap = (
  cartridge: ModuleCartridge,
  seed: string,
  commandsManager: CommandsManager,
  telemetry?: RuntimeTelemetryAdapter,
  executeCommand?: (command: string) => void,
): {
  context: CommandHandlerContext;
  entityStore: RuntimeEntityStore;
  impulseEngine: ImpulseEngine;
  state: {
    tick: number;
    seed: string;
    status: "idle" | "running" | "paused" | "fatal";
  };
  systemsRegistry: RuntimeSystemsRegistry;
} => {
  const entityStore = new RuntimeEntityStore();
  const impulseEngine = new ImpulseEngine(resolveImpulseConfig(cartridge));
  const systemsRegistry = new RuntimeSystemsRegistry();
  const state = { tick: 0, seed, status: "idle" as const };
  resetRuntimeCoreState(
    entityStore,
    impulseEngine,
    commandsManager,
    state,
    cartridge,
  );
  return {
    context: createCommandHandlerContext(
      entityStore,
      cartridge,
      impulseEngine,
      commandsManager,
      telemetry,
      executeCommand,
    ),
    entityStore,
    impulseEngine,
    state,
    systemsRegistry,
  };
};
