import Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import {
    isBodyEntity,
    readAssignmentId,
} from "../../runtime/assignment/assignmentReaders";
import { RuntimeCommandType } from "../../runtime/types";
import {
    enqueueDragAssignment,
    resolveDragReleaseUpdate,
    type ResolveDraggedBodyDropTarget,
} from "./entityDragController.assignment";
import { syncCaveDragState } from "./syncCaveDragState";

type DragState = {
    id: string;
    originOwnerId?: string;
    startX: number;
    startY: number;
    startWorldX: number;
    startWorldY: number;
};

export class EntityDragController {
    private readonly scene: Phaser.Scene;
    private readonly getRuntime: () => Runtime | null;
    private readonly selectEntity: (id: string | null) => void;
    private readonly resolveDropTarget: ResolveDraggedBodyDropTarget;
    private drag: DragState | null = null;

    constructor(
        scene: Phaser.Scene,
        getRuntime: () => Runtime | null,
        selectEntity: (id: string | null) => void,
        resolveDropTarget: ResolveDraggedBodyDropTarget,
    ) {
        this.scene = scene;
        this.getRuntime = getRuntime;
        this.selectEntity = selectEntity;
        this.resolveDropTarget = resolveDropTarget;
    }

    public bind(): void {
        this.scene.input.on("gameobjectdown", this.onObjectDown, this);
        this.scene.input.on("pointermove", this.onPointerMove, this);
        this.scene.input.on("pointerup", this.onPointerUp, this);
    }

    public destroy(): void {
        this.scene.input.off("gameobjectdown", this.onObjectDown, this);
        this.scene.input.off("pointermove", this.onPointerMove, this);
        this.scene.input.off("pointerup", this.onPointerUp, this);
    }

    private onObjectDown(
        pointer: Phaser.Input.Pointer,
        obj: Phaser.GameObjects.GameObject,
    ): void {
        const id = obj.getData("entityId") as string | undefined;
        if (!id) return;
        const runtime = this.getRuntime();
        if (!runtime) return;
        const pointerEntity = runtime.getEntity("sys_pointer") as
            | { assignment?: { assignedIds?: string[] } }
            | undefined;
        const pointerActive =
            pointer.button === 2 ||
            (pointer.button === 0 &&
                (pointerEntity?.assignment?.assignedIds?.length ?? 0) > 0);
        if (pointerActive) return;
        this.selectEntity(id);
        const entity = runtime.getEntity(id) as any;
        if (!entity) return;
        if (id === "sys_world") return;
        const body = runtime.getPhysicsBody(id);
        if (!body) return;
        if (isBodyEntity(entity)) {
            enqueueDragAssignment(runtime, {
                bodyId: id,
                ownerId: "sys_pointer",
            });
        }
        this.drag = {
            id,
            originOwnerId: isBodyEntity(entity)
                ? readAssignmentId(entity)
                : undefined,
            startX: body.position.x,
            startY: body.position.y,
            startWorldX: pointer.worldX,
            startWorldY: pointer.worldY,
        };
        syncCaveDragState(runtime, true, id);
        if (runtime.getState().status === "paused") runtime.flushCommands();
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.drag || !pointer.isDown) return;
        const runtime = this.getRuntime();
        if (!runtime) return;
        const x = this.drag.startX + (pointer.worldX - this.drag.startWorldX);
        const y = this.drag.startY + (pointer.worldY - this.drag.startWorldY);
        runtime.commands.enqueue({
            type: RuntimeCommandType.POSITION_ENTITY,
            payload: { id: this.drag.id, x, y },
        });
        if (runtime.getState().status === "paused") runtime.flushCommands();
    }

    private onPointerUp(pointer?: Phaser.Input.Pointer): void {
        const runtime = this.getRuntime();
        const drag = this.drag;
        if (runtime && drag?.originOwnerId) {
            enqueueDragAssignment(
                runtime,
                resolveDragReleaseUpdate(
                    runtime,
                    { id: drag.id, originOwnerId: drag.originOwnerId },
                    pointer && {
                        worldX: pointer.worldX,
                        worldY: pointer.worldY,
                    },
                    this.resolveDropTarget,
                ),
            );
        }
        syncCaveDragState(runtime, false, "");
        if (this.drag) runtime?.stepOncePreservingPause();
        this.drag = null;
    }
}

