import { useContext } from "react";
import { IconRegistryContext } from "./IconRegistryContext";
import { IconDefinition } from "./types";
import { IconKey } from "./IconKey";

const FALLBACK_ICON: IconDefinition = { type: "image", value: "" };

export const useIcon = (id: IconKey | string): IconDefinition => {
    const context = useContext(IconRegistryContext);

    if (!context) {
        console.warn("useIcon used outside of IconRegistryProvider");
        return FALLBACK_ICON;
    }

    const icon = context.getIcon(id);

    // If not found, try to return a generic fallback or the "unknown" icon
    if (!icon) {
        return context.getIcon(IconKey.Unknown) || FALLBACK_ICON;
    }

    return icon;
};

