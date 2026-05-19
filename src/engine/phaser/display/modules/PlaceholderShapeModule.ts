import type {
    DisplayInitContext,
    DisplayTickContext,
    DisplayDestroyContext,
} from "../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../moduleTypes";
import { isRadiusVisible } from "../../scenes/gameSceneMath";
import type { PlaceholderVariantRegistry } from "../placeholder/PlaceholderVariantRegistry";

const MODULE_ID = "PlaceholderShapeModule";
const SHAPE_RADIUS_FRACTION = 0.45;

export const createPlaceholderShapeModule = (
    variants: PlaceholderVariantRegistry,
): DisplayModuleFactory => ({
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const { pools, spec, scratch, scene } = ctx;
        const pool = pools.get(spec.display_key);
        const img = pool.imagePool.acquire(scene);
        scratch.root.add(img);
        scratch.mainImage = img;

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                const { spec: s, scratch: sc } = tickCtx;
                if (!sc.mainImage) return;

                if (!isRadiusVisible(s.radius)) {
                    sc.mainImage.setVisible(false);
                    return;
                }

                const variant = variants.get(s.display_key);
                sc.mainImage.setTexture(variant.texture);
                sc.mainImage.setRotation((variant.rotation * Math.PI) / 180);
                sc.mainImage.setFlipX(variant.flipX);
                const scale = (s.radius * SHAPE_RADIUS_FRACTION) / 32;
                sc.mainImage.setScale(scale);
                sc.mainImage.setVisible(true);
            },
            destroy(dCtx: DisplayDestroyContext): void {
                const { pools: p, spec: s, scratch: sc } = dCtx;
                if (sc.mainImage) {
                    sc.root.remove(sc.mainImage);
                    p.get(s.display_key).imagePool.release(sc.mainImage);
                    sc.mainImage = null;
                }
            },
        };
    },
});
