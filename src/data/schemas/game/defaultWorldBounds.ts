import {
    AUTHORED_WORLD_POSITION,
    DEFAULT_WORLD_POSITION,
} from "../v2/worldPositionDefaults";

const BASE_WORLD_BOUNDS = { width: 5000, height: 5000 };

export const DEFAULT_WORLD_BOUNDS = {
    width:
        BASE_WORLD_BOUNDS.width +
        Math.max(0, DEFAULT_WORLD_POSITION.x - AUTHORED_WORLD_POSITION.x),
    height:
        BASE_WORLD_BOUNDS.height +
        Math.max(0, DEFAULT_WORLD_POSITION.y - AUTHORED_WORLD_POSITION.y),
};
