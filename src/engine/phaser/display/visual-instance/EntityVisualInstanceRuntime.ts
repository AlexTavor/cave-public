import type { DisplayModuleRuntime } from "../moduleTypes";
import type { DisplayRegistry } from "../DisplayRegistry";
import type {
    DisplayDestroyContext,
    DisplayInitContext,
    DisplayScratch,
    DisplaySpec,
} from "../types";
import {
    resolveCanonicalInteractionTarget,
    restoreInteractiveTarget,
} from "../interactionHitArea";

export const createDisplayModuleRuntimes = (
    displayRegistry: DisplayRegistry,
    spec: DisplaySpec,
    initCtx: DisplayInitContext,
) =>
    displayRegistry
        .resolve(spec.display_key)
        .moduleStack.map((factory) => factory.create(initCtx));

export const destroyDisplayModuleRuntimes = (
    runtimes: DisplayModuleRuntime[],
    destroyCtx: DisplayDestroyContext,
) => {
    for (let index = runtimes.length - 1; index >= 0; index -= 1) {
        runtimes[index].destroy(destroyCtx);
    }
};

export const setScratchAlpha = (scratch: DisplayScratch, alpha: number) => {
    (scratch.backgroundImage ?? scratch.root).setAlpha(alpha);
};

export const updateScratchInteraction = (
    scratch: DisplayScratch,
    blocked: boolean,
) => {
    const target = resolveCanonicalInteractionTarget(scratch);
    if (!target) return;
    if (blocked) {
        if ((target as any).input) (target as any).disableInteractive?.();
        return;
    }
    if ((target as any).input) {
        (target as any).input.enabled = true;
        return;
    }
    restoreInteractiveTarget(target as any);
};
