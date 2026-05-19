import type { RuntimeEntity } from "../types";
import type { PhysicsComponent } from "../../../data/schemas/physics";
import type { PhysicsBody } from "../../physics/impulse/types";
import { stringHash } from "../../../utils/deterministicHash";
import type { CommandHandlerContext } from "./types";
import { SysConfigSchema } from "../../../data/schemas/v2/config";

export const resolveBlueprint = (
    blueprintId: string,
    context: CommandHandlerContext,
) => {
    const blueprint = context.cartridge.blueprints[blueprintId];
    if (blueprint) return blueprint;

    if (blueprintId === "sys_world" || blueprintId === "sys_pointer") {
        const config = SysConfigSchema.parse(
            context.cartridge.config?.settings ?? {},
        );
        const systemEntity =
            blueprintId === "sys_pointer" ? config.pointer : config.world;
        return {
            id: blueprintId,
            label: (systemEntity as any).label ?? blueprintId,
            tags: (systemEntity as any).tags ?? [],
            components: systemEntity as any,
        };
    }

    return undefined;
};

type DisplayRadiusConfig = {
    min?: number;
    max?: number;
    valueRef?: string;
    maxRef?: string;
};

const resolveNumericPath = (entity: RuntimeEntity, path: string): number => {
    if (!path) return 0;

    const cleanPath = path.startsWith("self.") ? path.slice(5) : path;
    const segments = cleanPath.split(".").filter(Boolean);

    let current: unknown = entity;
    for (const segment of segments) {
        if (!current || typeof current !== "object") return 0;
        current = (current as Record<string, unknown>)[segment];
    }

    if (typeof current === "number" && Number.isFinite(current)) return current;

    if (current && typeof current === "object" && "value" in current) {
        const val = (current as { value?: unknown }).value;
        if (typeof val === "number" && Number.isFinite(val)) return val;
    }

    return 0;
};

export const syncPhysicsRadiusFromDisplay = (
    entity: RuntimeEntity,
    blueprintDisplay?: unknown,
): void => {
    const displayCandidate =
        (entity as { display?: unknown }).display ?? blueprintDisplay;
    const display = displayCandidate as { radius?: DisplayRadiusConfig };
    const physics = (entity as { physics?: { radius?: number } }).physics;

    if (!display?.radius || !physics) return;

    const { min = 10, max = 20, valueRef, maxRef } = display.radius;
    let ratio = 0;

    if (valueRef) {
        const val = resolveNumericPath(entity, valueRef);
        if (maxRef) {
            const maxVal = resolveNumericPath(entity, maxRef);
            ratio = maxVal > 0 ? val / maxVal : 0;
        } else {
            ratio = val;
        }
    }

    const clampedRatio = Math.max(0, Math.min(1, ratio));
    physics.radius = min + (max - min) * clampedRatio;
};

export const buildPhysicsBody = (
    id: string,
    component: PhysicsComponent,
): PhysicsBody => {
    const position = { x: component.x, y: component.y };
    return {
        id,
        entity: id,
        x: position.x,
        y: position.y,
        mass: component.mass,
        radius: component.radius,
        drag: component.drag,
        position: { ...position },
        prevPosition: { ...position },
        acceleration: { x: 0, y: 0 },
        isStatic: component.isStatic,
        layer: "default",
        seed: stringHash(id),
        anchor: component.anchor,
    };
};

