import type { ModuleCartridge } from "../../data/schemas/module";
import type { ImpulseConfig } from "../../data/schemas/physics";
import type { PhysicsBody } from "../physics/impulse/types";
import type { SaveGameData } from "./persistence/types";
import { RuntimeCore } from "./RuntimeCore";
import type { CommandHandler } from "./handlers/types";
import type { BodyHabitiAssigner } from "./handlers/bodyHabitiAssigner";
import type { RuntimeCommand, RuntimeEntity, RuntimeState } from "./types";
import type { AutomationSnapshot } from "./systems/AutomationSystem";
import { GlobalEffectsIndexer } from "./systems/GlobalEffectsIndexer";
import type { System } from "./systems/System";

export abstract class RuntimeAccessors extends RuntimeCore {
    protected globalEffectsIndexer!: GlobalEffectsIndexer;

    public setWorldBounds(width: number, height: number): void {
        this.impulseEngine.setWorldBounds(width, height);
    }

    public updateImpulseConfig(config: ImpulseConfig): void {
        this.impulseEngine.updateConfig(config);
    }

    public setTimeScale(scale: number): void {
        if (!Number.isFinite(scale)) return;
        this.timeScale = Math.max(0, scale);
    }

    public getTimeScale(): number {
        return this.timeScale;
    }

    public getAccumulatedTime(): number {
        return this.totalAccumulatedTime;
    }

    public getTimestep(): number {
        return this.timeStep;
    }

    public getPhysicsBody(id: string): PhysicsBody | undefined {
        return this.impulseEngine.getBody(id);
    }

    public getState(): RuntimeState {
        return this.state;
    }

    public getCartridge(): ModuleCartridge {
        return this.cartridge;
    }

    public getEntity(id: string): RuntimeEntity | undefined {
        return this.entityStore.getEntity(id);
    }

    public getEntities(): ReadonlyArray<RuntimeEntity> {
        return this.entityStore.getEntities();
    }

    public getWorld() {
        return this.entityStore.getWorld();
    }

    public getEntityCount(): number {
        return this.entityStore.getEntityCount();
    }

    public getAutomationSnapshot(): AutomationSnapshot {
        return this.systemsRegistry.getAutomationSnapshot();
    }

    public getGlobalEffectsIndexer(): GlobalEffectsIndexer {
        return this.globalEffectsIndexer;
    }

    public registerSystem(system: System): void {
        this.systemsRegistry.registerSystem(system);
    }

    public registerPreBehaviorSystem(system: System): void {
        this.systemsRegistry.registerPreBehaviorSystem(system);
    }

    public registerCommandHandler(
        handler: CommandHandler<RuntimeCommand>,
    ): void {
        this.commandsManager.registerHandler(handler);
    }

    /**
     * Injects the game's habiti-assignment algorithm onto the command-handler
     * context so the engine spawn path can compute habiti without importing
     * game. Called once when the game wires itself into the runtime
     * (registerGameCommandHandlers); the context object is stable for the
     * runtime's lifetime, so this survives state resets.
     */
    public setBodyHabitiAssigner(assigner: BodyHabitiAssigner): void {
        this.context.assignBodyHabiti = assigner;
    }

    public registerPhysicsBody(body: PhysicsBody): void {
        this.impulseEngine.addBody(body);
    }

    public abstract addEntity(entity: RuntimeEntity): void;
    public abstract createSnapshot(): import("./Snapshot").Snapshot;
    public abstract hydrate(data: SaveGameData): void;
}
