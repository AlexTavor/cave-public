import { registerPhaserDebugResetter } from "./phaserDebugToggle";

export interface DisplayObjectPoolStats {
    created: number;
    available: number;
    availableOnScene: number;
    inUse: number;
    highWaterInUse: number;
}

export interface DisplayTypePoolStats {
    displayKey: string;
    rootPool: DisplayObjectPoolStats;
    backgroundAnchorPool: DisplayObjectPoolStats;
    effectsAnchorPool: DisplayObjectPoolStats;
    overlayAnchorPool: DisplayObjectPoolStats;
    imagePool: DisplayObjectPoolStats;
    ropePool: DisplayObjectPoolStats;
    graphicsPool: DisplayObjectPoolStats;
}

export interface TextureManagerStats {
    totalTextureCount: number;
    managedTextureCount: number;
    placeholderTextureCount: number;
    glyphTextureCount: number;
    shapeTextureCount: number;
    shapeTextureKeys: string[];
}

export interface DisplayInstanceManagerStats {
    activeInstances: number;
    activeByDisplayKey: Record<string, number>;
    pools: Record<string, DisplayTypePoolStats>;
}

export interface PhaserSceneDebugSnapshot {
    sceneId: string;
    sceneKey: string;
    updatedAtMs: number;
    runtime: {
        id: string;
        tick: number;
        status: string;
        entityCount: number;
        accumulatedTime: number;
    } | null;
    display: DisplayInstanceManagerStats | null;
    textures: TextureManagerStats | null;
    phaser: {
        displayListCount: number;
        tweenCount: number;
    };
}

export interface CaveDebugApi {
    scenes: Record<string, PhaserSceneDebugSnapshot>;
    getSceneSnapshots: () => PhaserSceneDebugSnapshot[];
    logSceneSnapshots: () => PhaserSceneDebugSnapshot[];
}

const ensureDebugApi = (): CaveDebugApi => {
    const root = globalThis as typeof globalThis & {
        __caveDebug?: CaveDebugApi;
    };

    if (root.__caveDebug) return root.__caveDebug;

    const api: CaveDebugApi = {
        scenes: {},
        getSceneSnapshots: () => Object.values(api.scenes),
        logSceneSnapshots: () => {
            const snapshots = Object.values(api.scenes);
            console.table(
                snapshots.map((snapshot) => ({
                    sceneId: snapshot.sceneId,
                    sceneKey: snapshot.sceneKey,
                    runtimeStatus: snapshot.runtime?.status ?? "none",
                    runtimeTick: snapshot.runtime?.tick ?? -1,
                    entityCount: snapshot.runtime?.entityCount ?? 0,
                    activeInstances: snapshot.display?.activeInstances ?? 0,
                    displayListCount: snapshot.phaser.displayListCount,
                    tweenCount: snapshot.phaser.tweenCount,
                    totalTextureCount:
                        snapshot.textures?.totalTextureCount ?? 0,
                    shapeTextureCount:
                        snapshot.textures?.shapeTextureCount ?? 0,
                })),
            );
            return snapshots;
        },
    };

    root.__caveDebug = api;
    return api;
};

export const publishPhaserDebugSnapshot = (
    snapshot: PhaserSceneDebugSnapshot,
): void => {
    const api = ensureDebugApi();
    api.scenes[snapshot.sceneId] = snapshot;
};

export const getCaveDebugApi = (): CaveDebugApi | undefined =>
    (globalThis as typeof globalThis & { __caveDebug?: CaveDebugApi })
        .__caveDebug;

export const clearPhaserDebugSnapshot = (sceneId: string): void => {
    const api = ensureDebugApi();
    delete api.scenes[sceneId];
};

registerPhaserDebugResetter(() => {
    const api = getCaveDebugApi();
    if (!api) return;
    api.scenes = {};
});
