import { createContext } from "react";

export interface PortalContextValue {
    /**
     * specific DOM nodes for each layer.
     * Populated once the PortalSystem has mounted and created the DOM structure.
     */
    roots: Record<string, HTMLElement | null>;
}

export const PortalContext = createContext<PortalContextValue | null>(null);
