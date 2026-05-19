import type { RuntimeEntity } from "../../engine/runtime/types";
import type { BodyComponent } from "../../data/schemas/game/body";
import { resolveXpThreshold } from "../systems/body/progression";

export type ProcessingOutput = {
    resource: string;
    source: "attribute" | "lifetime_xp" | "fixed";
    attribute?: "body" | "mind" | "social";
    factor?: number;
    min?: number;
    target?: string;
};

const isProcessingOutput = (value: unknown): value is ProcessingOutput => {
    if (!value || typeof value !== "object") return false;
    const output = value as ProcessingOutput;
    return (
        typeof output.resource === "string" &&
        (output.source === "attribute" ||
            output.source === "lifetime_xp" ||
            output.source === "fixed")
    );
};

export const resolveProcessingOutputs = (
    station: RuntimeEntity,
): ProcessingOutput[] => {
    const raw = (station as { state?: any }).state?.processing_outputs?.value;
    if (!Array.isArray(raw)) return [];
    const outputs = raw.filter(isProcessingOutput);
    return outputs;
};

const resolveAttributes = (body: BodyComponent) =>
    body.attributes ??
    body.baseAttributes ?? {
        body: 0,
        mind: 0,
        social: 0,
    };

export const calculateLifetimeXp = (body: BodyComponent): number => {
    const level = Number.isFinite(body.level) ? body.level : 1;
    const xp = typeof body.xp === "number" ? body.xp : 0;
    let total = xp;

    for (let i = 1; i < level; i += 1) {
        total += resolveXpThreshold(i);
    }

    return total;
};

export const resolveOutputAmount = (
    body: BodyComponent,
    config: ProcessingOutput,
): number => {
    let baseValue = 0;

    if (config.source === "attribute" && config.attribute) {
        const attrs = resolveAttributes(body);
        baseValue = attrs?.[config.attribute] ?? 0;
    } else if (config.source === "lifetime_xp") {
        baseValue = calculateLifetimeXp(body);
    } else if (config.source === "fixed") {
        baseValue = 1;
    }

    const factor =
        typeof config.factor === "number" && Number.isFinite(config.factor)
            ? config.factor
            : 1;
    const min =
        typeof config.min === "number" && Number.isFinite(config.min)
            ? config.min
            : 0;
    const scaled = Math.floor(baseValue * factor);

    return Math.max(min, scaled);
};

