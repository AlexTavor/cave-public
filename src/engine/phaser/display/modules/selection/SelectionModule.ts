import type {
    DisplayInitContext,
    DisplayTickContext,
    DisplayDestroyContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import { RUNTIME_RING_TEXTURE_OPTIONS } from "../../../utils/runtimeRingTexture";

const MODULE_ID = "SelectionModule";
const HALO_COLOR = 0xffffff;
const HALO_PADDING = 1.2;

const resolveHaloScale = (halo: { width?: number }, radius: number): number =>
    (radius * HALO_PADDING * 2) / Math.max(halo.width ?? 1, 1);

export const SelectionModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const { scene, pools, spec, scratch, textureManager } = ctx;
        const pool = pools.get(spec.display_key);
        const halo = pool.imagePool.acquire(scene);
        halo.setTexture(
            textureManager.getGlyphTexture(RUNTIME_RING_TEXTURE_OPTIONS),
        );
        halo.setTint(HALO_COLOR);
        halo.setVisible(false);
        scratch.overlayAnchor.add(halo);
        let tweenTarget: string | null = null;

        const showHalo = (radius: number): void => {
            const scale = resolveHaloScale(halo, radius);
            halo.setVisible(true);
            const nextTarget = `${spec.entityId}:${radius}`;
            if (tweenTarget === nextTarget) return;
            tweenTarget = nextTarget;
            scene.tweens.killTweensOf(halo);
            halo.setAlpha(0.6);
            halo.setScale(scale * 0.5);
            scene.tweens.add({
                targets: halo,
                scale: scale * 1.6,
                alpha: 0,
                duration: 900,
                repeat: -1,
                ease: "Sine.easeOut",
            });
        };

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                const selected =
                    tickCtx.selectedEntityId === tickCtx.spec.entityId;
                if (!selected || !tickCtx.spec.hasPhysics) {
                    halo.setVisible(false);
                    if (!selected) tweenTarget = null;
                    return;
                }
                showHalo(tickCtx.spec.radius);
            },
            destroy(_dCtx: DisplayDestroyContext): void {
                scene.tweens.killTweensOf(halo);
                scratch.overlayAnchor.remove(halo);
                pool.imagePool.release(halo);
            },
        };
    },
};

