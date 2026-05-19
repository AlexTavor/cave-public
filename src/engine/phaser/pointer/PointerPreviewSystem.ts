import type Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import {
    hideCycleProgressRope,
    syncCycleProgressRope,
} from "../display/modules/cycle-progress/cycleProgressRopeRenderer";
import type { TextureManager } from "../utils/TextureManager";
import {
    resolvePreviewColor,
    resolvePreviewWidth,
} from "./pointerPreviewAppearance";
import { buildPointerPreviewPath } from "./pointerPreviewGeometry";
import {
    createPointerPreviewVisuals,
    destroyPointerPreviewVisuals,
    hidePointerPreviewVisuals,
} from "./pointerPreviewVisuals";
import {
    hidePointerPreviewImage,
    syncPointerPreviewImage,
} from "./pointerPreviewImage";
import {
    readPointerCarriedCount,
    readPointerStateNumber,
    readPointerStateString,
} from "./pointerPreviewState";

export class PointerPreviewSystem {
    private readonly visuals;

    public constructor(scene: Phaser.Scene, textureManager: TextureManager) {
        this.visuals = createPointerPreviewVisuals(scene, textureManager);
        hidePointerPreviewVisuals(this.visuals);
    }

    public update(runtime: Runtime, timeMs: number): void {
        const pointer = runtime.getPhysicsBody("sys_pointer");
        if (!pointer) {
            hidePointerPreviewVisuals(this.visuals);
            return;
        }
        const pickupRadius =
            readPointerStateNumber(runtime, "pointer_pickup_radius") || 90;
        const connectionRadius =
            readPointerStateNumber(runtime, "pointer_connection_radius") || 180;
        syncPointerPreviewImage(this.visuals.connectionRing, {
            x: pointer.x,
            y: pointer.y,
            radius: connectionRadius,
            tint: 0xffffff,
            alpha: 0.18,
        });
        syncPointerPreviewImage(this.visuals.pickupRing, {
            x: pointer.x,
            y: pointer.y,
            radius: pickupRadius,
            tint: 0xfff1b3,
            alpha: 0.35,
        });
        if (readPointerCarriedCount(runtime) > 0) {
            syncPointerPreviewImage(this.visuals.carryGlow, {
                x: pointer.x,
                y: pointer.y,
                radius: pickupRadius,
                tint: 0xfff1b3,
                alpha: 0.12,
            });
        } else {
            hidePointerPreviewImage(this.visuals.carryGlow);
        }
        const targetId = readPointerStateString(runtime, "pointer_target_id");
        const previewBodyId = readPointerStateString(
            runtime,
            "pointer_preview_body_id",
        );
        const previewAmount = readPointerStateNumber(
            runtime,
            "pointer_preview_amount",
        );
        if (!targetId || !previewBodyId || previewAmount <= 0) {
            hideCycleProgressRope(this.visuals.previewLine);
            return;
        }
        const previewBody = runtime.getPhysicsBody(previewBodyId);
        const target = runtime.getPhysicsBody(targetId);
        if (!previewBody || !target) {
            hideCycleProgressRope(this.visuals.previewLine);
            return;
        }
        const points = buildPointerPreviewPath({
            fromX: previewBody.x,
            fromY: previewBody.y,
            toX: target.x,
            toY: target.y,
            timeMs,
        });
        syncCycleProgressRope(this.visuals.previewLine, {
            textureKey: this.visuals.lineTextureKey,
            points,
            tint: resolvePreviewColor(runtime),
            alpha: 0.7,
            displayWidthPx: resolvePreviewWidth(runtime),
        });
    }

    public destroy(): void {
        destroyPointerPreviewVisuals(this.visuals);
    }
}
