import type { ModuleCartridge } from "../../data/schemas/module";
import { CommandsManager } from "./CommandsManager";
import type { RuntimeTelemetryAdapter } from "./RuntimeTelemetry";
import type { CommandHandlerContext } from "./handlers/types";
import { RuntimeInvalidationService } from "./RuntimeInvalidationService";
import { RuntimeEntityStore } from "./RuntimeEntityStore";
import { RuntimeSystemsRegistry } from "./RuntimeSystemsRegistry";
import type { Snapshot } from "./Snapshot";
import { createRuntimeCoreBootstrap } from "./runtimeCoreBootstrap";
import { createRuntimeCoreTickState } from "./runtimeCoreTickState";
import type { CommandBuffer, RuntimeCommand, RuntimeState } from "./types";
import { resolveRuntimeInvalidationSummary } from "./runtimeInvalidationSummary";

export class RuntimeCoreBase {
  public readonly id: string;
  public readonly commands: CommandBuffer<RuntimeCommand>;
  protected readonly state: RuntimeState;
  protected readonly cartridge: ModuleCartridge;
  protected readonly commandsManager: CommandsManager;
  protected readonly context: CommandHandlerContext;
  protected readonly entityStore: RuntimeEntityStore;
  protected readonly impulseEngine!: import("../physics/impulse/ImpulseEngine").ImpulseEngine;
  protected readonly systemsRegistry: RuntimeSystemsRegistry;
  protected previousSnapshot: Snapshot | null = null;
  protected timeScale = 1;
  protected totalAccumulatedTime = 0;
  protected timeStep = 0;
  protected readonly invalidation = new RuntimeInvalidationService();
  protected readonly tickState = createRuntimeCoreTickState();

  constructor(
    cartridge: ModuleCartridge,
    seed: string,
    commandsManager: CommandsManager,
    telemetry?: RuntimeTelemetryAdapter,
    executeCommand?: (command: string) => void,
  ) {
    // Debug-only handle (read once, in publishGameSceneDebugSnapshot) — not on the
    // sim path, so it isn't replay-affecting. Derive it from the seed instead of
    // nanoid() to satisfy the engine determinism gate; same seed → same id is fine
    // (and handy when correlating replay debug snapshots).
    this.id = `runtime_${seed}`;
    this.cartridge = cartridge;
    this.commandsManager = commandsManager;
    this.commands = commandsManager;
    const bootstrap = createRuntimeCoreBootstrap(
      cartridge,
      seed,
      this.commandsManager,
      telemetry,
      executeCommand,
    );
    this.context = bootstrap.context;
    this.entityStore = bootstrap.entityStore;
    this.impulseEngine = bootstrap.impulseEngine;
    this.state = bootstrap.state;
    this.systemsRegistry = bootstrap.systemsRegistry;
  }

  public flushCommands(): number {
    if (this.state.status === "fatal") return 0;
    const commands = this.commandsManager.process(this.context);
    this.invalidation.publishMutationSummary(
      resolveRuntimeInvalidationSummary(commands),
    );
    return commands.length;
  }

  public play(): void {
    if (this.state.status !== "fatal") this.state.status = "running";
  }

  public pause(): void {
    if (this.state.status !== "fatal") this.state.status = "paused";
  }

  public getInvalidation() {
    return this.invalidation.reader;
  }
}
