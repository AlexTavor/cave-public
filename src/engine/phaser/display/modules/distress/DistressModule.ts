import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayTickContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import type { BodyComponent } from "../../../../../data/schemas/game/body";
import type { Runtime } from "../../../../runtime/Runtime";
import {
    DISTRESS_THRESHOLD,
    resolveBodyPhysicsPosition,
    resolveHealthRatio,
    resolveInterval,
} from "../../../visuals/distressTarget";
import { hideDistressHalos, startDistressBurst } from "./distressHaloHelpers";
import { RUNTIME_RING_TEXTURE_OPTIONS } from "../../../utils/runtimeRingTexture";

const MODULE_ID = "DistressModule";
const WAVE_COLOR = 0xff3b30;

const readBody = (entity: Record<string, unknown>): BodyComponent | null =>
    entity.body && typeof entity.body === "object"
        ? (entity.body as BodyComponent)
        : null;

const readRuntime = (scene: DisplayTickContext["scene"]): Runtime | null => {
    const candidate = scene as DisplayTickContext["scene"] & {
        readRuntime?: () => Runtime | null;
    };
    return typeof candidate.readRuntime === "function"
        ? candidate.readRuntime()
        : null;
};

export const DistressModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const { scene, scratch, pools, spec, textureManager } = ctx;
        const pool = pools.get(spec.display_key);
        const textureKey = textureManager.getGlyphTexture(
            RUNTIME_RING_TEXTURE_OPTIONS,
        );
        const halos = Array.from({ length: 3 }, () => {
            const halo = pool.imagePool.acquire(scene);
            halo.setTexture(textureKey);
            halo.setTint(WAVE_COLOR);
            halo.setVisible(false);
            scratch.overlayAnchor.add(halo);
            return halo;
        });
        let burstKey: string | null = null;

        const hideHalos = (): void => {
            hideDistressHalos(scene.tweens, halos);
            burstKey = null;
        };

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext): void {
                const body = readBody(tickCtx.entity);
                if (!body) {
                    hideHalos();
                    return;
                }
                const ratio = resolveHealthRatio(body);
                if (ratio >= DISTRESS_THRESHOLD) {
                    hideHalos();
                    return;
                }
                const target = tickCtx.spec.hasPhysics
                    ? tickCtx.spec
                    : (() => {
                          const runtime = readRuntime(tickCtx.scene);
                          return runtime && tickCtx.entity.id
                              ? resolveBodyPhysicsPosition(
                                    runtime,
                                    tickCtx.entity.id,
                                )
                              : null;
                      })();
                if (!target) {
                    hideHalos();
                    return;
                }
                scratch.root.setVisible(true);
                scratch.overlayAnchor.setPosition(target.x, target.y);
                scratch.overlayAnchor.setVisible(true);
                const nextKey = `${tickCtx.entity.id}:${target.radius}:${resolveInterval(ratio)}`;
                if (nextKey === burstKey) return;
                burstKey = nextKey;
                startDistressBurst(
                    scene.tweens,
                    halos,
                    target.radius,
                    resolveInterval(ratio),
                );
            },
            destroy(_dCtx: DisplayDestroyContext): void {
                hideHalos();
                halos.forEach((halo) => {
                    scratch.overlayAnchor.remove(halo);
                    pool.imagePool.release(halo);
                });
            },
        };
    },
};

