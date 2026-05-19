import type { MutateAction } from "../../../../data/schemas/behavior";
import type { BehaviorContext } from "./ValueResolver";

const caveAttributes = new Set(["body", "mind", "social"]);

export const parseCaveTarget = (
    target: string,
    context: BehaviorContext,
): { entityId: string; attribute: string } | null => {
    const parts = target.split(".");
    const caveIndex = parts.indexOf("cave");
    if (caveIndex <= 0 || parts[caveIndex + 1] !== "attributes") return null;
    const attribute = parts[caveIndex + 2];
    if (!attribute || !caveAttributes.has(attribute)) return null;

    const entityId = resolveEntityId(parts[0] ?? "", context);
    if (!entityId) return null;

    return { entityId, attribute };
};

export const parseMaxTarget = (target: string): string | null => {
    if (!target.startsWith("self.state.") || !target.endsWith(".max")) {
        return null;
    }
    const key = target.slice("self.state.".length, -".max".length);
    return key.trim() ? key : null;
};

export const parseEntityStateTarget = (
    target: string,
): { entityId: string; key: string } | null => {
    if (
        target.startsWith("self.") ||
        target.startsWith("global.") ||
        target.startsWith("globals.")
    ) {
        return null;
    }

    const match = /^([^.]+)\.state\.([^.]+)(?:\.value)?$/.exec(target);
    if (!match) return null;

    const [, entityId, key] = match;
    if (!entityId || !key) return null;
    return { entityId, key };
};

export const applyMutation = (
    op: MutateAction["op"],
    base: number,
    value: number,
): number => {
    switch (op) {
        case "SET":
            return value;
        case "ADD":
            return base + value;
        case "SUB":
            return base - value;
    }
};

export const resolveTargetKey = (target: string): string | null => {
    const stripValueSuffix = (value: string): string =>
        value.endsWith(".value") ? value.slice(0, -".value".length) : value;

    if (target.startsWith("global.")) {
        return stripValueSuffix(target.slice("global.".length));
    }

    if (target.startsWith("globals.")) {
        return stripValueSuffix(target.slice("globals.".length));
    }

    if (target.startsWith("self.state.")) {
        return stripValueSuffix(target.slice("self.state.".length));
    }

    if (target.startsWith("self.")) {
        return stripValueSuffix(target.slice("self.".length));
    }

    return null;
};

export const resolveEntityId = (
    ref: string,
    context: BehaviorContext,
): string => {
    if (ref === "self") {
        return context.self.id ?? "";
    }
    return ref;
};

