import type {
    DisplayInitContext,
    DisplayTickContext,
    DisplayDestroyContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import { createNodeOverlayDisplayBoundsFromRadius } from "../../nodeOverlayDisplayBounds";

const MODULE_ID = "TransformModule";

const createRuntime = (): DisplayModuleRuntime => ({
    id: MODULE_ID,
    tick(ctx: DisplayTickContext): void {
        const { spec, scratch } = ctx;
        const anchors = [
            scratch.root,
            scratch.backgroundAnchor,
            scratch.effectsAnchor,
            scratch.overlayAnchor,
        ];

        if (!spec.hasPhysics) {
            scratch.nodeOverlayDisplayBounds = null;
            for (const a of anchors) a.setVisible(false);
            return;
        }

        scratch.nodeOverlayDisplayBounds =
            createNodeOverlayDisplayBoundsFromRadius({
                entityId: spec.entityId,
                centerX: spec.x,
                centerY: spec.y,
                radius: spec.radius,
            });
        for (const a of anchors) {
            a.setPosition(spec.x, spec.y);
            a.setVisible(true);
        }
    },
    destroy(_ctx: DisplayDestroyContext): void {
        // Anchors released by instance destroy; nothing to do here.
    },
});

export const TransformModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(_ctx: DisplayInitContext): DisplayModuleRuntime {
        return createRuntime();
    },
};

