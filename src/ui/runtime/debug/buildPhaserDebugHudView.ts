import type {
    DisplayTypePoolStats,
    PhaserSceneDebugSnapshot,
} from "../../../engine/phaser/debug/phaserDebugStats";
import type { PhaserDebugGlobals } from "./readPhaserDebugGlobals";

export interface PhaserDebugHudSceneView {
    sceneId: string;
    facts: Array<{ label: string; value: string }>;
    pools: string[];
}

const countAvailableOnScene = (pool: DisplayTypePoolStats): number =>
    (pool.rootPool.availableOnScene ?? 0) +
    (pool.backgroundAnchorPool.availableOnScene ?? 0) +
    (pool.effectsAnchorPool.availableOnScene ?? 0) +
    (pool.overlayAnchorPool.availableOnScene ?? 0) +
    (pool.imagePool.availableOnScene ?? 0) +
    (pool.ropePool.availableOnScene ?? 0) +
    (pool.graphicsPool.availableOnScene ?? 0);

const formatPoolLine = (pool: DisplayTypePoolStats): string =>
    `${pool.displayKey} img ${pool.imagePool.inUse}/${pool.imagePool.created}` +
    ` gfx ${pool.graphicsPool.inUse}/${pool.graphicsPool.created}` +
    ` aos r${pool.rootPool.availableOnScene ?? 0}` +
    ` b${pool.backgroundAnchorPool.availableOnScene ?? 0}` +
    ` e${pool.effectsAnchorPool.availableOnScene ?? 0}` +
    ` o${pool.overlayAnchorPool.availableOnScene ?? 0}` +
    ` i${pool.imagePool.availableOnScene ?? 0}` +
    ` rp${pool.ropePool.availableOnScene ?? 0}` +
    ` g${pool.graphicsPool.availableOnScene ?? 0}`;

const rankPool = (pool: DisplayTypePoolStats): number =>
    countAvailableOnScene(pool) * 1000 +
    pool.imagePool.highWaterInUse +
    pool.graphicsPool.highWaterInUse +
    pool.rootPool.highWaterInUse;

export const buildPhaserDebugHudView = (
    snapshots: PhaserSceneDebugSnapshot[],
    globals: PhaserDebugGlobals,
): PhaserDebugHudSceneView[] =>
    snapshots.map((snapshot) => {
        const runtimeDebug = (snapshot as any).runtimeDebug as
            | { previousSnapshotReady?: boolean }
            | undefined;
        const veins = (snapshot as any).veins as
            | { edgeCount?: number }
            | undefined;
        const pools = Object.values(snapshot.display?.pools ?? {})
            .sort((left, right) => rankPool(right) - rankPool(left))
            .slice(0, 3)
            .map(formatPoolLine);

        return {
            sceneId: snapshot.sceneId,
            facts: [
                ["runtime", snapshot.runtime?.status ?? "none"],
                ["tick", String(snapshot.runtime?.tick ?? 0)],
                ["entities", String(snapshot.runtime?.entityCount ?? 0)],
                ["visuals", String(snapshot.display?.activeInstances ?? 0)],
                ["textures", String(snapshot.textures?.totalTextureCount ?? 0)],
                ["shapes", String(snapshot.textures?.shapeTextureCount ?? 0)],
                ["display", String(snapshot.phaser.displayListCount)],
                ["tweens", String(snapshot.phaser.tweenCount)],
                ["games", String(globals.activeGameCount)],
                ["canvases", String(globals.canvasCount)],
                ["snapshots", String(snapshots.length)],
                ["heapUsedMb", globals.heapUsedMb],
                ["heapTotalMb", globals.heapTotalMb],
                ["snapTot", String(globals.snapshotTotal)],
                ["snap/s", globals.snapshotRate],
                ["tickSnap", String(globals.tickSnapshotTotal)],
                ["rtSnap", String(globals.runtimeSnapshotTotal)],
                ["dirty", String(globals.dirtyMarkTotal)],
                ["sorts", String(globals.entitySortTotal)],
                ["cmdApp", String(globals.appliedCommandTotal)],
                ["cmdEmit", String(globals.emittedCommandTotal)],
                ["appTop", globals.topAppliedType],
                ["emitTop", globals.topEmittedType],
                ["emitSys", globals.topEmittingSystem],
                [
                    "prevSnap",
                    runtimeDebug?.previousSnapshotReady ? "yes" : "no",
                ],
                ["veinEdges", String(veins?.edgeCount ?? 0)],
            ].map(([label, value]) => ({ label, value })),
            pools,
        };
    });
