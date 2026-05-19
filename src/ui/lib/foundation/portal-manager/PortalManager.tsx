import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { PortalContext, PortalContextValue } from "./PortalContext";
import { PORTAL_LAYERS } from "./types";

interface PortalManagerProps {
    children: React.ReactNode;
}

const MOUSE_EVENTS = [
    "click",
    "contextmenu",
    "mousedown",
    "pointerdown",
    "wheel",
] as const;

const stopMouseEvent = (event: Event): void => {
    event.stopPropagation();
};

/**
 * The PortalManager acts as the infrastructure manager for the UI.
 * It injects a container into the document body and establishes the
 * managed portal stacking context system.
 */
export const PortalManager: React.FC<PortalManagerProps> = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    const rootsRef = useRef<Record<string, HTMLElement | null>>({
        overlay: null,
        callout: null,
        tooltip: null,
        float: null,
        toast: null,
    });

    useLayoutEffect(() => {
        const container = document.createElement("div");
        container.id = "game-portal-root";
        container.style.position = "absolute";
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.pointerEvents = "none"; // Let clicks pass through empty space
        container.style.overflow = "hidden"; // Prevent portal content from scrolling the body

        for (const [key, config] of Object.entries(PORTAL_LAYERS)) {
            const layerDiv = document.createElement("div");
            layerDiv.id = config.id;
            layerDiv.style.position = "fixed"; // Fixed relative to viewport
            layerDiv.style.top = "0";
            layerDiv.style.left = "0";
            layerDiv.style.width = "100%";
            layerDiv.style.height = "100%";
            layerDiv.style.zIndex = config.zIndex.toString();
            layerDiv.style.pointerEvents = "none"; // Let clicks pass through layer background
            for (const eventName of MOUSE_EVENTS) {
                layerDiv.addEventListener(eventName, stopMouseEvent);
            }

            container.appendChild(layerDiv);
            rootsRef.current[key] = layerDiv;
        }

        document.body.appendChild(container);
        setMounted(true);

        return () => {
            for (const layerDiv of Object.values(rootsRef.current)) {
                if (!layerDiv) continue;
                for (const eventName of MOUSE_EVENTS) {
                    layerDiv.removeEventListener(eventName, stopMouseEvent);
                }
            }
            container.remove();
            rootsRef.current = {
                overlay: null,
                callout: null,
                tooltip: null,
                float: null,
                toast: null,
            };
        };
    }, []);

    const value: PortalContextValue = useMemo(
        () => ({
            roots: rootsRef.current,
        }),
        [rootsRef.current],
    );

    // Don't render children until the portal roots exist to avoid flickers/errors
    if (!mounted) {
        return null;
    }

    return (
        <PortalContext.Provider value={value}>
            {children}
        </PortalContext.Provider>
    );
};

