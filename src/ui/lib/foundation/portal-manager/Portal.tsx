import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePortalRoot } from "./usePortalRoot";
import { PortalLayer } from "./types";

interface PortalProps {
    children: React.ReactNode;
    layer: PortalLayer;
}

/**
 * A wrapper component that renders its children into one of the managed portal layers.
 */
export const Portal: React.FC<PortalProps> = ({ children, layer }) => {
    const root = usePortalRoot(layer);
    const [mounted, setMounted] = useState(false);

    // Wait for hydration/mount to ensure DOM is ready
    useLayoutEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted || !root) {
        return null;
    }

    return createPortal(children, root);
};
