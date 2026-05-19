export type PortalLayer = "overlay" | "float" | "toast" | "tooltip" | "callout";

export const PORTAL_LAYERS: Record<
    PortalLayer,
    { id: string; zIndex: number }
> = {
    overlay: {
        id: "portal-overlays",
        zIndex: 20000, // Top-most blocking interactions (Modals)
    },
    callout: {
        id: "portal-callouts",
        zIndex: 40000, // Tutorial and runtime callouts above all other UI
    },
    tooltip: {
        id: "portal-tooltips",
        zIndex: 30000, // Hover overlays above modals
    },
    float: {
        id: "portal-floats",
        zIndex: 2000, // Contextual world overlays
    },
    toast: {
        id: "portal-toasts",
        zIndex: 3000, // System messages (Notifications)
    },
};

