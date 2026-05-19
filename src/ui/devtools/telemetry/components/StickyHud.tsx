import React from "react";
import { StickyValue } from "../../../runtime/state/types";
import {
    EmptyState,
    HudGrid,
    HudItem,
    HudLabel,
    HudValue,
} from "./StickyHud.styles";

export interface StickyHudProps {
    sticky: Record<string, StickyValue>;
}

export const StickyHud: React.FC<StickyHudProps> = ({ sticky }) => {
    const entries = Object.entries(sticky);

    if (entries.length === 0) {
        return <EmptyState>No runtime telemetry yet.</EmptyState>;
    }

    return (
        <HudGrid>
            {entries.map(([key, value]) => (
                <HudItem key={key}>
                    <HudLabel>{key}</HudLabel>
                    <HudValue>{value}</HudValue>
                </HudItem>
            ))}
        </HudGrid>
    );
};
