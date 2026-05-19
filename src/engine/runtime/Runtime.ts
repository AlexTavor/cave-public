import type { ModuleCartridge } from "../../data/schemas/module";
import type { CommandsManager } from "./CommandsManager";
import type { RuntimeTelemetryAdapter } from "./RuntimeTelemetry";
import { recordSnapshotAllocation } from "./debug/runtimeAllocationStats";
import { hydrateRuntime } from "./persistence/hydrateRuntime";
import type { SaveGameData } from "./persistence/types";
import { RuntimeAccessors } from "./RuntimeAccessors";
import { Snapshot } from "./Snapshot";
import { GlobalEffectsIndexer } from "./systems/GlobalEffectsIndexer";
import type { RuntimeEntity } from "./types";
import {
  EMPTY_RUNTIME_INVALIDATION_SUMMARY,
  resolveRuntimeInvalidationSummary,
} from "./runtimeInvalidationSummary";

export class Runtime extends RuntimeAccessors {
  private invalidationMuted = false;

  constructor(
    cartridge: ModuleCartridge,
    seed: string,
    commandsManager: CommandsManager,
    telemetry?: RuntimeTelemetryAdapter,
    executeCommand?: (command: string) => void,
  ) {
    super(cartridge, seed, commandsManager, telemetry, executeCommand);
    this.globalEffectsIndexer = new GlobalEffectsIndexer();
    this.registerPreBehaviorSystem(this.globalEffectsIndexer);
  }

  public addEntity(entity: RuntimeEntity): void {
    this.entityStore.addEntity(entity);
    if (this.invalidationMuted) return;
    this.invalidation.publishMutationSummary({
      ...EMPTY_RUNTIME_INVALIDATION_SUMMARY,
      changedEntityIds: entity.id ? [entity.id] : [],
      entityListChanged: true,
    });
  }

  public createSnapshot(): Snapshot {
    recordSnapshotAllocation("runtime-create");
    return new Snapshot(
      this.entityStore.getEntities(),
      this.impulseEngine,
      this.cartridge.blueprints,
    );
  }

  public flushCommands(): number {
    if (this.state.status === "fatal") return 0;
    const previous = this.createSnapshot();
    const commands = this.commandsManager.process(this.context);
    this.invalidation.publishMutationSummary(
      resolveRuntimeInvalidationSummary(commands),
    );
    if (commands.length === 0) return 0;
    const current = this.createSnapshot();
    this.context.telemetry.onCommandsApplied?.(commands, previous, current);
    this.previousSnapshot = current;
    return commands.length;
  }

  public hydrate(data: SaveGameData): void {
    this.invalidationMuted = true;
    try {
      hydrateRuntime(this, data);
    } finally {
      this.invalidationMuted = false;
    }
    this.invalidation.publishWorldReset(this.state.tick);
  }
}
