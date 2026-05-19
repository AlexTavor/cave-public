import type { DisplayScratch } from "./types";

type InteractiveTarget = {
    input?: {
        enabled?: boolean;
        hitArea?: { radius?: number; setTo?: (...args: number[]) => void };
    } | null;
    setInteractive?: (...args: any[]) => unknown;
    disableInteractive?: () => unknown;
    __interactionHitArea?: { x?: number; y?: number; radius?: number };
    __interactionHitTest?: unknown;
    __tutorialInteractionBlocked?: boolean;
    displayOriginX?: number;
    displayOriginY?: number;
    interactiveEnabled?: boolean;
    width?: number;
    height?: number;
};

const resolveLocalAxisCenter = (
    displayOrigin: number | undefined,
    size: number | undefined,
) => {
    if (typeof displayOrigin === "number") return displayOrigin;
    if (typeof size === "number") return size / 2;
    return 0;
};

const resolveLocalCenter = (target: InteractiveTarget) => ({
    x: resolveLocalAxisCenter(target.displayOriginX, target.width),
    y: resolveLocalAxisCenter(target.displayOriginY, target.height),
});

export const resolveCanonicalInteractionTarget = (
    scratch: Pick<DisplayScratch, "root"> | null | undefined,
): InteractiveTarget | null => scratch?.root ?? null;

export const bindInteractiveCircle = (
    target: InteractiveTarget,
    hitArea: { x?: number; y?: number; radius?: number },
    hitTest: unknown,
) => {
    const center = resolveLocalCenter(target);
    hitArea.x = center.x;
    hitArea.y = center.y;
    target.__interactionHitArea = hitArea;
    target.__interactionHitTest = hitTest;
    target.setInteractive?.(hitArea, hitTest);
};

export const refreshInteractiveCircle = (
    target: InteractiveTarget,
    radius: number,
) => {
    if (target.__interactionHitArea) {
        const center = resolveLocalCenter(target);
        target.__interactionHitArea.x = center.x;
        target.__interactionHitArea.y = center.y;
        target.__interactionHitArea.radius = radius;
    }
    const inputHitArea = target.input?.hitArea;
    if (!inputHitArea) return;
    if (typeof inputHitArea.setTo === "function") {
        inputHitArea.setTo(
            target.__interactionHitArea?.x ?? 0,
            target.__interactionHitArea?.y ?? 0,
            radius,
        );
        return;
    }
    if ("radius" in inputHitArea) inputHitArea.radius = radius;
};

export const restoreInteractiveTarget = (target: InteractiveTarget) => {
    const hitArea = target.__interactionHitArea;
    if (!hitArea || !target.__interactionHitTest) return;
    target.setInteractive?.(hitArea, target.__interactionHitTest);
};
