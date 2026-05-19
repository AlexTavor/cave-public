import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayTickContext,
} from "../../types";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import {
    AVATAR_EYE_TINT,
    AVATAR_FIT_RADIUS,
    AVATAR_OUTLINE_SCALE,
    AVATAR_OUTLINE_TINT,
    AVATAR_ROLE_BY_DISPLAY_KEY,
    AVATAR_SILHOUETTE_TINT,
} from "../../avatar/AvatarDisplayConstants";
import { resolveAvatarSubjectSeed } from "../../avatar/AvatarSeedResolver";
import { resolveBlinkScale } from "../../avatar/avatarBlink";
import type { AvatarAppearanceRegistry } from "../../avatar/AvatarAppearanceRegistry";
import { createNodeOverlayDisplayBoundsFromImageBounds } from "../../node-overlay/nodeOverlayDisplayBounds";
import { readDisplaySceneRuntime } from "../../readDisplaySceneRuntime";
import { hideAvatarImages, renderAvatarStack } from "./avatarStackRender";

const MODULE_ID = "AvatarModule";

export const createAvatarModule = (
    avatarRegistry: AvatarAppearanceRegistry,
): DisplayModuleFactory => ({
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const pool = ctx.pools.get(ctx.spec.display_key).imagePool;
        const glowImage = pool.acquire(ctx.scene);
        const silhouetteImage = pool.acquire(ctx.scene);
        const eyesImage = pool.acquire(ctx.scene);
        ctx.scratch.root.add(glowImage);
        ctx.scratch.root.add(silhouetteImage);
        ctx.scratch.root.add(eyesImage);
        ctx.scratch.backgroundImage = ctx.scratch.mainImage = silhouetteImage;
        const images = [glowImage, silhouetteImage, eyesImage];

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                if (
                    !tickCtx.spec.hasPhysics ||
                    !isRadiusVisible(tickCtx.spec.radius)
                )
                    return hideAvatarImages(images);
                const role =
                    AVATAR_ROLE_BY_DISPLAY_KEY[
                        tickCtx.spec
                            .display_key as keyof typeof AVATAR_ROLE_BY_DISPLAY_KEY
                    ];
                if (!role) {
                    console.error(
                        `[AvatarModule] Invalid avatar display key: ${tickCtx.spec.display_key}`,
                    );
                    return hideAvatarImages(images);
                }
                const subjectSeed = resolveAvatarSubjectSeed(
                    tickCtx.entity,
                    readDisplaySceneRuntime(tickCtx.scene) as any,
                );
                if (!subjectSeed) {
                    console.error(
                        `[AvatarModule] Missing subject seed for entity: ${tickCtx.spec.entityId}`,
                    );
                    return hideAvatarImages(images);
                }
                const appearance = avatarRegistry.resolve(subjectSeed);
                const scale = tickCtx.spec.radius / AVATAR_FIT_RADIUS;
                const blinkScale = resolveBlinkScale(
                    tickCtx.timeMs,
                    appearance,
                );
                renderAvatarStack(
                    tickCtx.textureManager,
                    {
                        glowImage,
                        silhouetteImage,
                        eyesImage,
                    },
                    appearance,
                    {
                        x: 0,
                        y: 0,
                        scale,
                        blinkScale,
                        outlineScale: AVATAR_OUTLINE_SCALE,
                        silhouetteTint: AVATAR_SILHOUETTE_TINT,
                        outlineTint: AVATAR_OUTLINE_TINT,
                        eyeTint: AVATAR_EYE_TINT,
                    },
                );
                const bounds = createNodeOverlayDisplayBoundsFromImageBounds(
                    tickCtx.spec.entityId,
                    silhouetteImage.getBounds(),
                );
                if (bounds) tickCtx.scratch.nodeOverlayDisplayBounds = bounds;
            },
            destroy(dCtx: DisplayDestroyContext): void {
                const poolRef = dCtx.pools.get(dCtx.spec.display_key).imagePool;
                dCtx.scratch.root.remove(glowImage);
                dCtx.scratch.root.remove(silhouetteImage);
                dCtx.scratch.root.remove(eyesImage);
                poolRef.release(glowImage);
                poolRef.release(silhouetteImage);
                poolRef.release(eyesImage);
                if (dCtx.scratch.backgroundImage === silhouetteImage)
                    dCtx.scratch.backgroundImage = null;
                if (dCtx.scratch.mainImage === silhouetteImage)
                    dCtx.scratch.mainImage = null;
            },
        };
    },
});
