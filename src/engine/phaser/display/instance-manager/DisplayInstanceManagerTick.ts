import type { DisplaySpec } from "../types";
import type { RuntimeEntity } from "../../../runtime/types";
import type { EntityVisualInstance } from "../visual-instance/EntityVisualInstance";
import type { DisplayInstanceManagerDeps } from "./DisplayInstanceManager.types";
import { isDisplayActive } from "../displayActivity";
import { applyTutorialAttentionToInstance } from "./DisplayInstanceManager.tutorialAttention";

export const tickInstanceSafe = (
    instance: EntityVisualInstance,
    deps: DisplayInstanceManagerDeps,
    spec: DisplaySpec,
    entity: RuntimeEntity,
    timeMs: number,
    deltaMs: number,
): void => {
    const runtime = deps.getRuntime();
    const pv = isDisplayActive(entity, runtime)
        ? deps.pulseEngine.getDemandPulse(spec.entityId, timeMs)
        : 0;
    if (runtime)
        applyTutorialAttentionToInstance(
            runtime,
            entity,
            spec.entityId,
            instance,
        );
    try {
        instance.tick(
            spec,
            entity,
            timeMs,
            deltaMs,
            pv,
            deps.getSelectedEntityId(),
            deps.selectEntity,
        );
    } catch (err) {
        console.error(
            `[DisplayInstanceManager] tick error entity=${spec.entityId}`,
            err,
        );
    }
};
