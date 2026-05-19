import { useEffect, useRef } from "react";

const SPLITTER_DRAG_SELECTOR = ".flexlayout__splitter_drag";

const createPointerEvent = (doc: Document, type: string): Event => {
    const Ctor = doc.defaultView?.PointerEvent;
    return Ctor
        ? new Ctor(type, { bubbles: true })
        : new Event(type, { bubbles: true });
};

const replayPendingRelease = (
    doc: Document,
    replaying: { current: boolean },
    type: "pointerup" | "pointercancel",
) => {
    globalThis.setTimeout(() => {
        if (replaying.current || !doc.querySelector(SPLITTER_DRAG_SELECTOR)) {
            return;
        }
        replaying.current = true;
        doc.dispatchEvent(createPointerEvent(doc, type));
        replaying.current = false;
    }, 0);
};

export const useFlexlayoutPointerReleaseGuard = (enabled: boolean): void => {
    const replaying = useRef(false);

    useEffect(() => {
        if (!enabled) return;
        const doc = document;
        const host = globalThis;
        const onPointerRelease = () => {
            if (replaying.current) return;
            replayPendingRelease(doc, replaying, "pointerup");
        };
        const onBlur = () => {
            if (replaying.current) return;
            replayPendingRelease(doc, replaying, "pointercancel");
        };

        host.addEventListener("pointerup", onPointerRelease, true);
        host.addEventListener("pointercancel", onPointerRelease, true);
        host.addEventListener("blur", onBlur);
        return () => {
            host.removeEventListener("pointerup", onPointerRelease, true);
            host.removeEventListener("pointercancel", onPointerRelease, true);
            host.removeEventListener("blur", onBlur);
        };
    }, [enabled]);
};
