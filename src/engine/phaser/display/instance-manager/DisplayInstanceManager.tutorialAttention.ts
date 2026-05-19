import type { Runtime } from "../../../runtime/Runtime";
import type { EntityVisualInstance } from "../visual-instance/EntityVisualInstance";
import { isConditionalActivationThrottleHidden } from "../../../runtime/conditionalActivationState";
import { resolveCanonicalInteractionTarget } from "../interactionHitArea";

const TUTORIAL_DEEMPHASIS_ALPHA = 0.35;
export const CONDITIONAL_LOCK_ALPHA = 0.35;

const setInstanceAlpha = (instance: EntityVisualInstance, alpha: number) => {
    const scratch = (instance as any).scratch;
    scratch?.backgroundAnchor?.setAlpha(alpha);
    scratch?.backgroundImage?.setAlpha(alpha);
    scratch?.root?.setAlpha(alpha);
    scratch?.effectsAnchor?.setAlpha(alpha);
    scratch?.overlayAnchor?.setAlpha(alpha);
};

const readBaseAlpha = (entity: unknown) =>
    isConditionalActivationThrottleHidden(entity as any)
        ? CONDITIONAL_LOCK_ALPHA
        : 1;

const setInstanceInteractionBlocked = (
    instance: EntityVisualInstance,
    blocked: boolean,
) => {
    const target = resolveCanonicalInteractionTarget((instance as any).scratch);
    if (!target) return;
    target.__tutorialInteractionBlocked = blocked;
    if (target.input) {
        target.input.enabled = !blocked;
        return;
    }
    if (blocked) return target.disableInteractive?.();
    if ("interactiveEnabled" in target) target.interactiveEnabled = true;
};

const readAttention = (world: any) => {
    if (world?.habitiAnnouncement?.active)
        return world.habitiAnnouncement.attention;
    if (world?.tutorial?.active) return world.tutorial.attention;
    return null;
};

const readFocusedIds = (runtime: Runtime) => {
    const world = runtime.getEntity("sys_world") as any;
    const attention = readAttention(world);
    return {
        focusedIds: attention?.focusEntityIds ?? [],
        blockInteractions: attention?.blockNonFocusedInteraction === true,
    };
};

export const applyTutorialAttentionToInstance = (
    runtime: Runtime,
    entity: unknown,
    entityId: string,
    instance: EntityVisualInstance,
) => {
    const baseAlpha = readBaseAlpha(entity);
    const { focusedIds, blockInteractions } = readFocusedIds(runtime);
    if (focusedIds.length === 0) {
        instance.clearTutorialDeemphasis();
        setInstanceAlpha(instance, baseAlpha);
        instance.setTutorialInteractionBlocked(false);
        instance.setAttentionLightSuppressed(false);
        setInstanceInteractionBlocked(instance, false);
        return;
    }
    const isFocused = focusedIds.includes(entityId);
    if (isFocused) {
        instance.clearTutorialDeemphasis();
        setInstanceAlpha(instance, baseAlpha);
    } else {
        instance.applyTutorialDeemphasis();
        setInstanceAlpha(
            instance,
            Math.min(TUTORIAL_DEEMPHASIS_ALPHA, baseAlpha),
        );
    }
    instance.setTutorialInteractionBlocked(blockInteractions && !isFocused);
    instance.setAttentionLightSuppressed(!isFocused);
    setInstanceInteractionBlocked(instance, blockInteractions && !isFocused);
};
