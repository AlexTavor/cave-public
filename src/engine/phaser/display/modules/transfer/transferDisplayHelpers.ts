import type { RuntimeEntity } from "../../../../runtime/types";
import { BLEND_MODE_ADD, BLEND_MODE_NORMAL } from "../../blendModes";
import { computeTransferScale } from "../../../scenes/gameSceneMath";

type TransferLegacyRender = {
    mode: "legacy";
    visualType: string | null;
    color: string;
    baseRadius: number;
    effect: string;
};

type TransferPrettyRenderProps = {
    mode: "pretty";
    visualType: string | null;
    baseRadius: number;
    glyphPresetKey: string;
    glyphColor: string;
    light?: {
        shape: string;
        color: string;
        alpha: number;
        radiusFactor: number;
        blendMode: "NORMAL" | "ADD";
    };
    particles?: {
        shape: string;
        color: string;
        speed: unknown;
        lifespan: number;
        scale: unknown;
        alpha: unknown;
        frequency: number;
        quantity: number;
        blendMode: "NORMAL" | "ADD";
    };
};

type TransferRenderProps = TransferLegacyRender | TransferPrettyRenderProps;

type TransferEntity = RuntimeEntity & {
    transfer?: { payload?: Record<string, number> };
    render?: unknown;
};

export const readTransferPayload = (
    entity: RuntimeEntity,
): Record<string, number> | undefined =>
    (entity as TransferEntity).transfer?.payload;

export const readTransferRender = (
    entity: RuntimeEntity,
): TransferRenderProps | null => {
    const render = (entity as TransferEntity).render;
    if (!render || typeof render !== "object") return null;
    const mode = (render as { mode?: unknown }).mode;
    return mode === "pretty" || mode === "legacy"
        ? (render as TransferRenderProps)
        : null;
};

export const isPrettyTransferRender = (
    render: TransferRenderProps | null,
): render is TransferPrettyRenderProps => render?.mode === "pretty";

export const resolveTransferRadius = (
    entity: RuntimeEntity,
    baseRadius: number,
) => computeTransferScale(baseRadius, readTransferPayload(entity)).radius;

export const resolveTransferBlendMode = (blendMode: "NORMAL" | "ADD") =>
    blendMode === "ADD" ? BLEND_MODE_ADD : BLEND_MODE_NORMAL;
