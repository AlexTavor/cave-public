import type Phaser from "phaser";
import { LayerId, LAYER_DEPTHS } from "./LayerIds";

export class LayerRegistry {
    private readonly layers = new Map<LayerId, Phaser.GameObjects.Container>();
    private destroyed = false;

    constructor(scene: Phaser.Scene) {
        for (const id of Object.values(LayerId)) {
            const container = scene.add.container(0, 0);
            container.setDepth(LAYER_DEPTHS[id]);
            container.setName(`layer_${id}`);
            this.layers.set(id, container);
        }
    }

    public get(id: LayerId): Phaser.GameObjects.Container {
        const layer = this.layers.get(id);
        if (!layer) {
            throw new Error(`[LayerRegistry] Unknown layer: ${id}`);
        }
        return layer;
    }

    public destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        for (const container of this.layers.values()) {
            container.destroy();
        }
        this.layers.clear();
    }
}
