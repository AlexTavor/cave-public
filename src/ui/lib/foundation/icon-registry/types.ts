import React from "react";
import { IconKey } from "./IconKey";

export type IconType = "component" | "emoji" | "image";

export interface IconDefinition {
    type: IconType;
    value: string | React.FC<React.SVGProps<SVGSVGElement>>;
    tooltip?: string;
}

export interface IconRegistryState {
    icons: Record<string, IconDefinition>;
}

export interface IconRegistryContextValue {
    getIcon: (id: IconKey | string) => IconDefinition | null;
    registerIcon: (id: IconKey | string, def: IconDefinition) => void;
    hasIcon: (id: IconKey | string) => boolean;

    // Read-only access to the full registry (e.g. pickers/search)
    getAllIcons: () => Record<string, IconDefinition>;
}

