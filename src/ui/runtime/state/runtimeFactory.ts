import type { ModuleCartridge } from "../../../data/schemas/module";
import type { Runtime } from "../../../engine/runtime/Runtime";
import type { Ticker } from "../../../engine/runtime/Ticker";
import { createGame } from "../../../game/main";
import { useTelemetryStore } from "./useTelemetryStore";
import { syncTelemetry, createAutomationContext } from "./runtimeStoreHelpers";
import { createRuntimeRegistry } from "../terminal/runtimeRegistry";
import type { RuntimeCommand } from "../../../engine/runtime/types";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import { evaluateCinematicCommands } from "../cinematic/evaluateCinematicCommands";
import { resolveRuntimeNotificationEvents } from "../notifications/resolveRuntimeNotificationEvents";
import { runtimeNotificationStore } from "../notifications/runtimeNotificationStore";
import { resolveRuntimeVisualEffects } from "../effects/resolveRuntimeVisualEffects";
import { runtimeVisualEffectsStore } from "../effects/runtimeVisualEffectsStore";
import { runtimeCalloutStore } from "../world/node-overlays/runtime-callouts/runtimeCalloutStore";
import { evaluateRunStartCycleBannerCommands } from "../status/evaluateRunStartCycleBannerCommands";

type StoreGetter = () => {
  runtime: Runtime | null;
  loadCartridge: (cartridge: ModuleCartridge, seed?: string) => void;
  play: () => void;
  pause: () => void;
  step: () => number | null;
  reset?: () => void;
};

export const buildRuntime = (
  cartridge: ModuleCartridge,
  seed: string,
  ticker: Ticker,
  get: StoreGetter,
): Runtime => {
  const automationRegistry = createRuntimeRegistry();
  const telemetryAdapter = {
    log: (ch: "tick" | "systems" | "errors", msg: string) =>
      useTelemetryStore.getState().log(ch, msg),
    onCommandsApplied: (
      commands: RuntimeCommand[],
      prev: Snapshot,
      current: Snapshot,
    ) => {
      evaluateCinematicCommands(commands);
      const runtimeEvents = resolveRuntimeNotificationEvents(
        commands,
        prev,
        current,
      );
      if (runtimeEvents.length > 0) {
        runtimeNotificationStore.getState().applyEventBatch(runtimeEvents);
      }
      runtimeCalloutStore.getState().applyBatch([]);
      runtimeVisualEffectsStore.enqueueBatch(
        resolveRuntimeVisualEffects(commands, prev, current),
      );
      evaluateRunStartCycleBannerCommands(commands, current);
    },
  };
  const executeCommand = (command: string) =>
    void automationRegistry.execute(command, createAutomationContext(get));

  const runtime = createGame(cartridge, seed, telemetryAdapter, executeCommand);

  runtime.pause();
  ticker.setCallback((dt) => {
    runtime.tick(dt);
    syncTelemetry(runtime);
  });

  return runtime;
};
