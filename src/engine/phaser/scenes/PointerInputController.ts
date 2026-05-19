import Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import { RuntimeCommandType } from "../../runtime/types";
import {
    POINTER_DROP_STARTED_AT_MS,
    POINTER_PICKUP_STARTED_AT_MS,
} from "../../../game/systems/pointer/pointerTiming";

const syncPausedRuntime = (runtime: Runtime | null) => {
    if (runtime?.getState().status !== "paused") return;
    runtime.stepOncePreservingPause?.() ?? runtime.flushCommands?.();
};

export class PointerInputController {
    constructor(
        private readonly scene: Phaser.Scene,
        private readonly getRuntime: () => Runtime | null,
    ) {}

    public bind(): void {
        this.scene.input.mouse?.disableContextMenu();
        this.scene.input.on("pointermove", this.onPointerMove, this);
        this.scene.input.on("pointerdown", this.onPointerDown, this);
        this.scene.input.on("pointerup", this.onPointerUp, this);
    }

    public destroy(): void {
        this.scene.input.off("pointermove", this.onPointerMove, this);
        this.scene.input.off("pointerdown", this.onPointerDown, this);
        this.scene.input.off("pointerup", this.onPointerUp, this);
    }

    private updatePointerPosition(
        pointer: Phaser.Input.Pointer,
        runtime: Runtime | null,
    ) {
        pointer.updateWorldPoint?.(this.scene.cameras.main);
        runtime?.commands.enqueue({
            type: RuntimeCommandType.POSITION_ENTITY,
            payload: {
                id: "sys_pointer",
                x: pointer.worldX,
                y: pointer.worldY,
            },
        });
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        const runtime = this.getRuntime();
        this.updatePointerPosition(pointer, runtime);
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        const runtime = this.getRuntime();
        const nowMs = Date.now();
        this.updatePointerPosition(pointer, runtime);
        const key =
            pointer.button === 2 ? "pointer_pickup_down" : "pointer_drop_down";
        const startedAtKey =
            pointer.button === 2
                ? POINTER_PICKUP_STARTED_AT_MS
                : POINTER_DROP_STARTED_AT_MS;
        if (pointer.button === 0) {
            const carriedIds = ((runtime?.getEntity("sys_pointer") as any)
                ?.assignment?.assignedIds ?? []) as string[];
            if (carriedIds.length === 0) {
                syncPausedRuntime(runtime);
                return;
            }
        }
        [
            { key, value: true },
            { key: startedAtKey, value: nowMs },
        ].forEach((stateUpdate) =>
            runtime?.commands.enqueue({
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_pointer",
                    key: stateUpdate.key,
                    value: stateUpdate.value,
                    visible: false,
                },
            }),
        );
        syncPausedRuntime(runtime);
    }

    private onPointerUp(pointer: Phaser.Input.Pointer): void {
        const runtime = this.getRuntime();
        this.updatePointerPosition(pointer, runtime);
        const key =
            pointer.button === 2 ? "pointer_pickup_down" : "pointer_drop_down";
        const startedAtKey =
            pointer.button === 2
                ? POINTER_PICKUP_STARTED_AT_MS
                : POINTER_DROP_STARTED_AT_MS;
        [
            { key, value: false },
            { key: startedAtKey, value: 0 },
        ].forEach((stateUpdate) =>
            runtime?.commands.enqueue({
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_pointer",
                    key: stateUpdate.key,
                    value: stateUpdate.value,
                    visible: false,
                },
            }),
        );
        syncPausedRuntime(runtime);
    }
}
