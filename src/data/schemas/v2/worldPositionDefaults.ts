export const DEFAULT_WORLD_POSITION = { x: 4500, y: 4200 };
export const AUTHORED_WORLD_POSITION = { x: 2500, y: 2200 };
const WORLD_POSITION_DELTA = {
    x: DEFAULT_WORLD_POSITION.x - AUTHORED_WORLD_POSITION.x,
    y: DEFAULT_WORLD_POSITION.y - AUTHORED_WORLD_POSITION.y,
};

export const resolveWorldRelativePosition = (
    offsetX: number,
    offsetY: number,
) => ({
    x: DEFAULT_WORLD_POSITION.x + offsetX,
    y: DEFAULT_WORLD_POSITION.y + offsetY,
});

export const resolveAuthoredWorldPosition = (x: number, y: number) => ({
    x: x + WORLD_POSITION_DELTA.x,
    y: y + WORLD_POSITION_DELTA.y,
});

export const resolveAuthoredWorldCoordinates = (x: number, y: number) => ({
    x: x - WORLD_POSITION_DELTA.x,
    y: y - WORLD_POSITION_DELTA.y,
});

export const DEFAULT_PHYSICS_POSITION = resolveWorldRelativePosition(
    -500,
    -200,
);
export const DEFAULT_POINTER_POSITION = resolveWorldRelativePosition(0, 0);
