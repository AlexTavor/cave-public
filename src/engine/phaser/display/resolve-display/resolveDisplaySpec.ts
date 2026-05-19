import type { RuntimeEntity } from "../../../runtime/types";
import type { Blueprint } from "../../../../data/schemas/blueprint";
import type { DisplayAsset } from "../../../../data/schemas/assets";
import type { DisplaySpec, ResolvedDisplayStaticSpec } from "../types";
import { resolveDisplayRadius } from "../../scenes/gameSceneMath";
export { resolveDisplayStaticSpec } from "./resolveDisplaySpec.static";
import { resolveDisplayStaticSpec } from "./resolveDisplaySpec.static";

export const composeDisplaySpec = (
    staticSpec: ResolvedDisplayStaticSpec,
    entity: RuntimeEntity,
    physics: { x: number; y: number; radius: number } | null,
): DisplaySpec => {
    if (!physics) {
        return {
            ...staticSpec,
            hasPhysics: false,
            x: 0,
            y: 0,
            radius: 0,
        };
    }
    const { radius } = resolveDisplayRadius(
        entity,
        staticSpec.display as any,
        physics,
    );
    return {
        ...staticSpec,
        hasPhysics: true,
        x: physics.x,
        y: physics.y,
        radius,
    };
};

export const resolveDisplaySpec = (params: {
    entity: RuntimeEntity;
    blueprint: Blueprint | undefined;
    physics: { x: number; y: number; radius: number } | null;
    styles: Record<string, unknown>;
    displays: Record<string, DisplayAsset>;
    blueprints: Record<string, Blueprint | undefined>;
}): DisplaySpec | null => {
    const staticSpec = resolveDisplayStaticSpec(params);
    return staticSpec
        ? composeDisplaySpec(staticSpec, params.entity, params.physics)
        : null;
};

