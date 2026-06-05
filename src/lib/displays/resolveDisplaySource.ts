import type { Blueprint } from "../../data/schemas/blueprint";
import type { DisplayAsset } from "../../data/schemas/assets";
import {
    BODY_AVATAR_DISPLAY_KEY,
    isBuiltInDisplayKey,
} from "./displayKeyKinds";

export type DisplaySource =
    | { kind: "display"; key: string; asset: DisplayAsset }
    | { kind: "builtin"; key: string }
    | { kind: "blueprint"; key: string; blueprintId: string }
    | { kind: "unknown"; key: string; asset: DisplayAsset };

const GENERIC_BLUEPRINT_DISPLAY_KEY = "generic_node";
const RESERVED_BUILTIN_DISPLAY_KEYS = new Set(["cave_level"]);

const resolveAssetDisplayKey = (asset: DisplayAsset): string => {
    if (asset.type === "body") return BODY_AVATAR_DISPLAY_KEY;
    if (asset.type === "resource") return GENERIC_BLUEPRINT_DISPLAY_KEY;
    return `attr_${asset.attribute}`;
};

export const resolveDisplaySource = (params: {
    displayKey: string;
    displays: Record<string, DisplayAsset>;
    blueprints: Record<string, Blueprint | undefined>;
}): DisplaySource => {
    const { displays, blueprints } = params;
    const { displayKey } = params;
    if (RESERVED_BUILTIN_DISPLAY_KEYS.has(displayKey)) {
        return { kind: "builtin", key: displayKey };
    }
    const authored = displays[displayKey];
    if (authored) {
        return {
            kind: "display",
            key: resolveAssetDisplayKey(authored),
            asset: authored,
        };
    }
    if (isBuiltInDisplayKey(displayKey)) {
        return { kind: "builtin", key: displayKey };
    }
    if (blueprints[displayKey])
        return {
            kind: "blueprint",
            key: GENERIC_BLUEPRINT_DISPLAY_KEY,
            blueprintId: displayKey,
        };
    const unknown = displays.unknown;
    if (unknown) {
        return {
            kind: "unknown",
            key: resolveAssetDisplayKey(unknown),
            asset: unknown,
        };
    }
    throw new Error(
        `[resolveDisplaySource] Unresolved display key: ${displayKey}`,
    );
};
