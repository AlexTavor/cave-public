import type { Blueprint } from "../../../data/schemas/blueprint";
import type { WorldPresenceAbilityConfig } from "../../../data/schemas/abilities/worldPresence";
import { SpatialRadiusSchema } from "../../../data/schemas/v2/spatial";
import {
    PHYSICS_DEFAULT_DRAG,
    PHYSICS_DEFAULT_MASS,
} from "../../../data/schemas/physicsConstants";
import { resolveAuthoredWorldPosition } from "../../../data/schemas/v2/worldPositionDefaults";

export const spatialCompiler = (
    draft: Blueprint,
    config: WorldPresenceAbilityConfig,
): void => {
    const radius = SpatialRadiusSchema.parse(config.radius ?? {});
    const isBody = draft.tags?.includes("body") ?? false;
    const position = resolveAuthoredWorldPosition(config.x, config.y);
    draft.components ??= {} as Blueprint["components"];
    draft.components.spatial = {
        x: position.x,
        y: position.y,
        radius: { ...radius },
    };

    const display = draft.components.display;
    if (display) {
        display.radius = { ...radius };
    }

    if (draft.components.physics) {
        draft.components.physics.x = position.x;
        draft.components.physics.y = position.y;
        draft.components.physics.radius = radius.max;
        draft.components.physics.isStatic = !isBody;
    } else {
        draft.components.physics = {
            mass: PHYSICS_DEFAULT_MASS,
            radius: radius.max,
            drag: PHYSICS_DEFAULT_DRAG,
            isStatic: !isBody,
            x: position.x,
            y: position.y,
        };
    }
};

