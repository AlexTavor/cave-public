import { beforeEach, describe, expect, it, vi } from "vitest";
import { runtimeNotificationStore } from "../notifications/runtimeNotificationStore";

const evaluateCinematicCommands = vi.fn();
const resolveRuntimeNotificationEvents = vi.fn();
const resolveRuntimeVisualEffects = vi.fn();
const enqueueVisualBatch = vi.fn();
let capturedTelemetry: any;

vi.mock("../../../game/main", () => ({
  createGame: vi.fn((_cartridge, _seed, telemetry) => {
    capturedTelemetry = telemetry;
    return {
      getState: () => ({ status: "idle" }),
      getCartridge: () => ({ config: {} }),
      tick: vi.fn(),
      destroy: vi.fn(),
      pause: vi.fn(),
      setTimeScale: vi.fn(),
    };
  }),
}));
vi.mock("../cinematic/evaluateCinematicCommands", () => ({
  evaluateCinematicCommands,
}));
vi.mock("../notifications/resolveRuntimeNotificationEvents", () => ({
  resolveRuntimeNotificationEvents,
}));
vi.mock("../effects/resolveRuntimeVisualEffects", () => ({
  resolveRuntimeVisualEffects,
}));
vi.mock("../effects/runtimeVisualEffectsStore", () => ({
  runtimeVisualEffectsStore: {
    enqueueBatch: enqueueVisualBatch,
    clear: vi.fn(),
  },
}));

describe("buildRuntime notification observer", () => {
  beforeEach(() => {
    runtimeNotificationStore.getState().reset();
    evaluateCinematicCommands.mockReset();
    resolveRuntimeNotificationEvents.mockReset();
    resolveRuntimeVisualEffects.mockReset();
    enqueueVisualBatch.mockReset();
  });

  it("keeps existing observers and pushes runtime notification events", async () => {
    const { buildRuntime } = await import("./runtimeFactory");
    const applySpy = vi.spyOn(
      runtimeNotificationStore.getState(),
      "applyEventBatch",
    );
    const commands = [{ type: "KILL", payload: { entityId: "body-1" } }];
    resolveRuntimeNotificationEvents.mockReturnValue([
      { kind: "body_starved", aggregationKey: "body_starved", count: 1 },
    ]);
    resolveRuntimeVisualEffects.mockReturnValue([
      {
        kind: "spawn_gold_rings",
        entityId: "body-1",
        x: 1,
        y: 2,
        radius: 3,
      },
    ]);

    buildRuntime(
      { config: {} } as any,
      "seed",
      { setCallback: vi.fn() } as any,
      () => ({
        runtime: null,
        loadCartridge: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        step: vi.fn(),
      }),
    );
    capturedTelemetry.onCommandsApplied(
      commands,
      { prev: true },
      { current: true },
    );

    expect(evaluateCinematicCommands).toHaveBeenCalledWith(commands);
    expect(resolveRuntimeNotificationEvents).toHaveBeenCalledWith(
      commands,
      { prev: true },
      { current: true },
    );
    expect(applySpy).toHaveBeenCalledWith([
      { kind: "body_starved", aggregationKey: "body_starved", count: 1 },
    ]);
    expect(resolveRuntimeVisualEffects).toHaveBeenCalledWith(
      commands,
      { prev: true },
      { current: true },
    );
    expect(enqueueVisualBatch).toHaveBeenCalledWith([
      {
        kind: "spawn_gold_rings",
        entityId: "body-1",
        x: 1,
        y: 2,
        radius: 3,
      },
    ]);
  }, 10000);
});
