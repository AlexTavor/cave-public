import { useContext } from "react";
import { PortalContext } from "./PortalContext";
import { PortalLayer } from "./types";

/**
 * Retrieves the DOM node for a specific portal layer.
 * @param layer The semantic layer name ('overlay', 'float', 'toast')
 * @returns The HTMLElement to render into.
 */
export const usePortalRoot = (layer: PortalLayer): HTMLElement | null => {
    const context = useContext(PortalContext);

    if (!context) {
        console.warn("usePortalRoot used outside of PortalSystem provider.");
        return null;
    }

    const root = context.roots[layer];

    if (!root) {
        console.warn(`Portal root for layer '${layer}' is missing.`);
        return null;
    }

    return root;
};
