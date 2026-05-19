import { LOGIC_STEP_MS } from "./runtimeConstants";
import { advanceRuntimeCoreTick } from "./runtimeCoreAdvance";
import {
    destroyRuntimeCoreState,
    resetRuntimeCoreState,
} from "./runtimeCoreState";
import { RuntimeCoreBase } from "./RuntimeCoreBase";
import { resolveRuntimeInvalidationSummary } from "./runtimeInvalidationSummary";

export class RuntimeCore extends RuntimeCoreBase {
    public stepOncePreservingPause(): number {
        if (this.state.status === "fatal") return this.state.tick;
        const restorePause = this.state.status === "paused";
        const timeScale = this.timeScale;
        if (restorePause) this.state.status = "running";
        if (timeScale === 0) this.timeScale = 1;
        try {
            this.tick(LOGIC_STEP_MS / this.timeScale);
        } finally {
            this.timeScale = timeScale;
            if (restorePause) this.state.status = "paused";
        }
        return this.state.tick;
    }

    public tick(dt: number): void {
        const previousTick = this.state.tick;
        const next = advanceRuntimeCoreTick(
            {
                invalidationSummarySink: (commands) =>
                    this.invalidation.bufferSummary(
                        resolveRuntimeInvalidationSummary(commands),
                    ),
                timeScale: this.timeScale,
                totalAccumulatedTime: this.totalAccumulatedTime,
                cartridge: this.cartridge,
                commandsManager: this.commandsManager,
                context: this.context,
                entityStore: this.entityStore,
                impulseEngine: this.impulseEngine,
                previousSnapshot: this.previousSnapshot,
                state: this.state,
                systemsRegistry: this.systemsRegistry,
                ...this.tickState,
            },
            dt,
        );
        if (!next) return;
        this.timeStep = next.timeStep;
        this.totalAccumulatedTime = next.totalAccumulatedTime;
        this.tickState.accumulator = next.accumulator;
        this.tickState.activeSnapshotBuffer = next.activeSnapshotBuffer;
        this.previousSnapshot = next.previousSnapshot;
        if (this.state.tick !== previousTick)
            this.invalidation.publishFrame(this.state.tick);
    }

    public destroy(): void {
        destroyRuntimeCoreState(
            this.entityStore,
            this.commandsManager,
            this.state,
        );
        this.totalAccumulatedTime = 0;
        this.previousSnapshot = null;
        Object.assign(this.tickState, {
            snapshotBuffers: [null, null],
            activeSnapshotBuffer: 0,
            accumulator: 0,
        });
        this.invalidation.publishWorldReset(0);
    }

    public reset(): void {
        resetRuntimeCoreState(
            this.entityStore,
            this.impulseEngine,
            this.commandsManager,
            this.state,
            this.cartridge,
        );
        this.totalAccumulatedTime = 0;
        this.previousSnapshot = null;
        Object.assign(this.tickState, {
            snapshotBuffers: [null, null],
            activeSnapshotBuffer: 0,
            accumulator: 0,
        });
        this.pause();
        this.invalidation.publishWorldReset(this.state.tick);
    }
}
