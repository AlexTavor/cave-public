import type {
    DisplayInitContext,
    DisplayTickContext,
    DisplayDestroyContext,
} from "../../types";
import type {
    DisplayModuleFactory,
    DisplayModuleRuntime,
} from "../../moduleTypes";
import Phaser from "phaser";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import {
    bindInteractiveCircle,
    refreshInteractiveCircle,
    resolveCanonicalInteractionTarget,
} from "../../interactionHitArea";

const MODULE_ID = "InteractionModule";

const isInteractionBlocked = (target: {
    __tutorialInteractionBlocked?: boolean;
}) => target.__tutorialInteractionBlocked === true;

const disableInteractiveSafely = (target: {
    input?: { enabled: boolean } | null;
    disableInteractive: () => void;
    scene?: { sys?: unknown };
}) => {
    if (!target.input) return;
    if (target.scene?.sys) target.disableInteractive();
    else target.input.enabled = false;
};

export const InteractionModule: DisplayModuleFactory = {
    id: MODULE_ID,
    create(ctx: DisplayInitContext): DisplayModuleRuntime {
        const { scratch, spec, selectEntity } = ctx;
        const hitCircle = new Phaser.Geom.Circle(0, 0, spec.radius);

        const target = resolveCanonicalInteractionTarget(scratch) as
            | DisplayInitContext["scratch"]["root"]
            | null;
        if (!target) {
            console.error(
                `[InteractionModule] No interactive target for entity: ${spec.entityId}`,
            );
            return { id: MODULE_ID, tick() {}, destroy() {} };
        }

        bindInteractiveCircle(
            target as any,
            hitCircle,
            Phaser.Geom.Circle.Contains,
        );
        target.setData("entityId", spec.entityId);
        target.on("pointerdown", () => {
            if (isInteractionBlocked(target as any)) return;
            selectEntity(spec.entityId);
        });

        return {
            id: MODULE_ID,
            tick(tickCtx: DisplayTickContext) {
                refreshInteractiveCircle(target as any, tickCtx.spec.radius);
                if (target.input) {
                    target.input.enabled =
                        tickCtx.spec.hasPhysics &&
                        isRadiusVisible(tickCtx.spec.radius) &&
                        !isInteractionBlocked(target as any);
                }
            },
            destroy(_: DisplayDestroyContext) {
                target.removeAllListeners("pointerdown");
                disableInteractiveSafely(target);
            },
        };
    },
};

