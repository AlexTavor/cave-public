import React from "react";
import { ThemeProvider } from "../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../lib/foundation/portal-manager/PortalManager";
import { IconRegistryProvider } from "../lib/foundation/icon-registry/IconRegistryProvider";
import { OrganicEdgeFilter } from "../lib/atoms/card";
import { DisplayRenderHost } from "../runtime/world/display-images/DisplayRenderHost";

export interface UiRootProps {
    children: React.ReactNode;
}

export const UiRoot: React.FC<UiRootProps> = ({ children }) => {
    return (
        <ThemeProvider>
            <DisplayRenderHost />
            <OrganicEdgeFilter />
            <PortalManager>
                <IconRegistryProvider>{children}</IconRegistryProvider>
            </PortalManager>
        </ThemeProvider>
    );
};

