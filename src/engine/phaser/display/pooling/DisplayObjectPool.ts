import type Phaser from "phaser";

const isOnSceneDisplayList = (obj: unknown): boolean => {
    const scene = (obj as { scene?: Phaser.Scene }).scene;
    return !!scene?.children.list.includes(
        obj as Phaser.GameObjects.GameObject,
    );
};

export class DisplayObjectPool<T> {
    private readonly pool: T[] = [];
    private readonly acquireFn?: (scene: Phaser.Scene, obj: T) => void;
    private readonly createFn: (scene: Phaser.Scene) => T;
    private readonly resetFn: (obj: T) => void;
    private readonly destroyFn: (obj: T) => void;
    private createdCount = 0;
    private inUseCount = 0;
    private highWaterInUse = 0;

    constructor(params: {
        acquire?: (scene: Phaser.Scene, obj: T) => void;
        create: (scene: Phaser.Scene) => T;
        reset: (obj: T) => void;
        destroy: (obj: T) => void;
    }) {
        this.acquireFn = params.acquire;
        this.createFn = params.create;
        this.resetFn = params.reset;
        this.destroyFn = params.destroy;
    }

    public acquire(scene: Phaser.Scene): T {
        const obj = this.pool.pop();
        if (obj) {
            (this.acquireFn ?? ((_scene, pooled) => this.resetFn(pooled)))(
                scene,
                obj,
            );
            this.inUseCount += 1;
            this.highWaterInUse = Math.max(
                this.highWaterInUse,
                this.inUseCount,
            );
            return obj;
        }
        const created = this.createFn(scene);
        this.createdCount += 1;
        this.inUseCount += 1;
        this.highWaterInUse = Math.max(this.highWaterInUse, this.inUseCount);
        return created;
    }

    public release(obj: T): void {
        this.resetFn(obj);
        this.inUseCount = Math.max(0, this.inUseCount - 1);
        this.pool.push(obj);
    }

    public getStats() {
        return {
            created: this.createdCount,
            available: this.pool.length,
            availableOnScene: this.pool.filter(isOnSceneDisplayList).length,
            inUse: this.inUseCount,
            highWaterInUse: this.highWaterInUse,
        };
    }

    public drainAndDestroy(): void {
        for (const obj of this.pool) {
            this.destroyFn(obj);
        }
        this.pool.length = 0;
    }
}

