import type { TransferVisual } from "../../../data/schemas/assets/resources";

export interface TransferLegacyRenderProps {
    mode: "legacy";
    visualType: string | null;
    color: string;
    baseRadius: number;
    effect: string;
}

export interface TransferPrettyRenderProps {
    mode: "pretty";
    visualType: string;
    baseRadius: number;
    glyphPresetKey: string;
    glyphColor: string;
    light: TransferVisual["light"];
    particles: TransferVisual["particles"];
}

export type TransferRenderProps =
    | TransferLegacyRenderProps
    | TransferPrettyRenderProps;
