import type Phaser from "phaser";
import { DisplayObjectPool } from "./DisplayObjectPool";
import type { DisplayTypePoolStats } from "../../debug/phaserDebugStats";
import {
    activatePooledObject,
    resetPooledContainer,
    resetPooledGraphics,
    resetPooledImage,
    resetPooledRope,
} from "./DisplayPoolObjectLifecycle";

const createContainerPool = () =>
    new DisplayObjectPool<Phaser.GameObjects.Container>({
        acquire: activatePooledObject,
        create: (scene) => scene.add.container(0, 0),
        reset: resetPooledContainer,
        destroy: (c) => c.destroy(),
    });

const createImagePool = () =>
    new DisplayObjectPool<Phaser.GameObjects.Image>({
        acquire: activatePooledObject,
        create: (scene) => {
            const img = scene.add.image(0, 0, "__DEFAULT");
            img.setVisible(false);
            return img;
        },
        reset: resetPooledImage,
        destroy: (img) => img.destroy(),
    });

const createRopePool = () =>
    new DisplayObjectPool<Phaser.GameObjects.Rope>({
        acquire: activatePooledObject,
        create: (scene) => {
            const rope = scene.add.rope(0, 0, "__DEFAULT");
            rope.setVisible(false);
            return rope;
        },
        reset: resetPooledRope,
        destroy: (rope) => rope.destroy(),
    });

const createGraphicsPool = () =>
    new DisplayObjectPool<Phaser.GameObjects.Graphics>({
        acquire: activatePooledObject,
        create: (scene) => {
            const g = scene.add.graphics();
            g.setVisible(false);
            return g;
        },
        reset: resetPooledGraphics,
        destroy: (g) => g.destroy(),
    });

export class DisplayTypePool {
    public readonly display_key: string;
    public readonly rootPool = createContainerPool();
    public readonly backgroundAnchorPool = createContainerPool();
    public readonly effectsAnchorPool = createContainerPool();
    public readonly overlayAnchorPool = createContainerPool();
    public readonly imagePool = createImagePool();
    public readonly ropePool = createRopePool();
    public readonly graphicsPool = createGraphicsPool();

    constructor(display_key: string) {
        this.display_key = display_key;
    }

    public drainAndDestroy(): void {
        this.rootPool.drainAndDestroy();
        this.backgroundAnchorPool.drainAndDestroy();
        this.effectsAnchorPool.drainAndDestroy();
        this.overlayAnchorPool.drainAndDestroy();
        this.imagePool.drainAndDestroy();
        this.ropePool.drainAndDestroy();
        this.graphicsPool.drainAndDestroy();
    }

    public getStats(): DisplayTypePoolStats {
        return {
            displayKey: this.display_key,
            rootPool: this.rootPool.getStats(),
            backgroundAnchorPool: this.backgroundAnchorPool.getStats(),
            effectsAnchorPool: this.effectsAnchorPool.getStats(),
            overlayAnchorPool: this.overlayAnchorPool.getStats(),
            imagePool: this.imagePool.getStats(),
            ropePool: this.ropePool.getStats(),
            graphicsPool: this.graphicsPool.getStats(),
        };
    }
}

