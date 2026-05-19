import { useEffect, useMemo, useRef, useState } from "react";
import { PhysicsComponentSchema } from "../../../../data/schemas/physics";
import { useSessionStore } from "../../state/useSessionStore";
import { parseVirtualPath } from "../window-manager/virtualPath";
import { useShellStore } from "../shell";

export const LAYOUT_GHOST_TIMEOUT_MS = 2000;

export interface LayoutGhostState {
    x: number;
    y: number;
    radius: number;
    visible: boolean;
}

const EMPTY_STATE: LayoutGhostState = {
    x: 0,
    y: 0,
    radius: 0,
    visible: false,
};

export const useLayoutGhost = (): LayoutGhostState => {
    const activeFilePath = useShellStore((s) => s.activeFilePath);
    const layoutDraft = useSessionStore((s) => {
        if (!activeFilePath) return undefined;
        const parsed = parseVirtualPath(activeFilePath);
        if (parsed.kind !== "blueprint") return undefined;
        return s.sessions[parsed.filename]?.draft.blueprints?.[
            parsed.blueprintId
        ]?.components?.physics;
    });

    const parsedLayout = useMemo(() => {
        if (!layoutDraft) return null;
        const result = PhysicsComponentSchema.safeParse(layoutDraft);
        return result.success ? result.data : null;
    }, [layoutDraft]);

    const [visible, setVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!parsedLayout) {
            setVisible(false);
            return;
        }

        setVisible(true);

        if (timeoutRef.current) {
            globalThis.clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = globalThis.setTimeout(() => {
            setVisible(false);
        }, LAYOUT_GHOST_TIMEOUT_MS);

        return () => {
            if (timeoutRef.current) {
                globalThis.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [parsedLayout]);

    if (!parsedLayout) {
        return EMPTY_STATE;
    }

    return {
        x: parsedLayout.x,
        y: parsedLayout.y,
        radius: parsedLayout.radius,
        visible,
    };
};
