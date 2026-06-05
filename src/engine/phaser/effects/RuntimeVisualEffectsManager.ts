import type Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import type { LayerRegistry } from "../display/layers/LayerRegistry";
import type { DisplayPoolRegistry } from "../display/pooling/DisplayPoolRegistry";
import type { TextureManager } from "../utils/TextureManager";
import type { RuntimeVisualEvent } from "../../runtime/runtimeVisualEvents";
import { consumeRuntimeVisualEffectBursts } from "./consumeRuntimeVisualEffectBursts";
import { PersistentAttentionRings } from "./PersistentAttentionRings";

const readAttention = (world: any) => {
    if (world?.habitiAnnouncement?.active)
        return world.habitiAnnouncement.attention;
    if (world?.tutorial?.active) return world.tutorial.attention;
    return null;
};

export class RuntimeVisualEffectsManager {
    private readonly persistent = new Map<string, PersistentAttentionRings>();

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly layers: LayerRegistry,
        private readonly pools: DisplayPoolRegistry,
        private readonly textureManager: TextureManager,
    ) {}

    public consume(
        events: RuntimeVisualEvent[],
        runtime: Runtime | null,
        nowMs: number,
        selectedEntityId: string | null = null,
    ): void {
        this.consumeBursts(events);
        if (!runtime) {
            this.destroy();
            return;
        }
        this.syncPersistentAttention(runtime, nowMs, selectedEntityId);
    }

    public destroy(): void {
        Array.from(this.persistent.keys()).forEach((id) =>
            this.destroyPersistent(id),
        );
    }

    private consumeBursts(events: RuntimeVisualEvent[]): void {
        consumeRuntimeVisualEffectBursts(
            this.scene,
            this.layers,
            this.pools,
            this.textureManager,
            events,
        );
    }

    private syncPersistentAttention(
        runtime: Runtime,
        nowMs: number,
        selectedEntityId: string | null,
    ): void {
        const world = runtime.getEntity("sys_world") as any;
        const attention = readAttention(world);
        const ringIds = new Set(
            ((attention?.ringEntityIds ?? []) as string[]).filter(
                (id) => id !== selectedEntityId,
            ),
        );
        Array.from(this.persistent.keys())
            .filter((id) => !ringIds.has(id))
            .forEach((id) => this.destroyPersistent(id));
        ringIds.forEach((id) => {
            const body = runtime.getPhysicsBody(id);
            if (!body) return this.destroyPersistent(id);
            const rings = this.persistent.get(id) ?? this.createPersistent(id);
            rings.update(
                body.position?.x ?? body.x,
                body.position?.y ?? body.y,
                body.radius,
                nowMs,
            );
        });
    }

    private createPersistent(entityId: string): PersistentAttentionRings {
        const rings = new PersistentAttentionRings(
            this.scene,
            this.layers,
            this.pools,
            this.textureManager,
        );
        this.persistent.set(entityId, rings);
        return rings;
    }

    private destroyPersistent(entityId: string): void {
        this.persistent.get(entityId)?.destroy(this.pools);
        this.persistent.delete(entityId);
    }
}
