import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayTickContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import { STANDARD_TEXTURE_RADIUS } from "../../../utils/TextureManager";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import {
    resolveAttributePoolKey,
    resolvePowerShape,
} from "./attributePowerVisuals";

const MODULE_ID = "AttributePoolShapeModule";

export const AttributePoolShapeModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const { scene, pools, spec, scratch } = ctx;
        const pool = pools.get(spec.display_key);
        const image = pool.imagePool.acquire(scene);
        scratch.backgroundAnchor.add(image);
        scratch.mainImage = image;

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                const { spec: nextSpec, textureManager } = tickCtx;
                if (!nextSpec.hasPhysics || !isRadiusVisible(nextSpec.radius)) {
                    image.setVisible(false);
                    return;
                }
                const attribute = resolveAttributePoolKey(nextSpec.display_key);
                if (!attribute) {
                    console.error(
                        `[AttributePoolShapeModule] Invalid display key: ${nextSpec.display_key}`,
                    );
                    image.setVisible(false);
                    return;
                }
                image.setTexture(
                    textureManager.getShapeTexture({
                        shape: resolvePowerShape(attribute),
                        color: "#ffffff",
                    }),
                );
                image.setScale(nextSpec.radius / STANDARD_TEXTURE_RADIUS);
                image.setVisible(true);
            },
            destroy(_dCtx: DisplayDestroyContext): void {
                scratch.backgroundAnchor.remove(image);
                pool.imagePool.release(image);
                if (scratch.mainImage === image) scratch.mainImage = null;
            },
        };
    },
};
