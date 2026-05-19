import { z } from "zod";
import { DisplayComponentSchema } from "../../../data/schemas/components";
import { EntityStyleSchema } from "../../../data/schemas/assets";
import { PhysicsComponentSchema } from "../../../data/schemas/physics";
import type { RuntimeEntity } from "../../runtime/types";

export type DisplayComponent = z.infer<typeof DisplayComponentSchema>;
export type PhysicsComponent = z.infer<typeof PhysicsComponentSchema>;
export type EntityStyle = z.infer<typeof EntityStyleSchema>;

export const parseDisplayComponent = (
    entity: RuntimeEntity,
    blueprintDisplay?: unknown,
): DisplayComponent | null => {
    const display = (entity as any).display ?? blueprintDisplay;
    if (!display || typeof display !== "object") return null;
    if (
        typeof display.label !== "string" ||
        typeof display.display_key !== "string"
    ) {
        return null;
    }
    return display as DisplayComponent;
};

export const parsePhysicsComponent = (
    entity: RuntimeEntity,
): PhysicsComponent | null => {
    const physics = (entity as any).physics;
    if (!physics || typeof physics !== "object") return null;
    if (typeof physics.x !== "number" || typeof physics.y !== "number") {
        return null;
    }
    return physics as PhysicsComponent;
};

export const parseEntityStyle = (candidate: unknown): EntityStyle | null => {
    const parsed = EntityStyleSchema.safeParse(candidate);
    if (!parsed.success) {
        if (candidate != null) {
            console.error(
                "[parseEntityStyle] Invalid style asset",
                parsed.error,
            );
        }
        return null;
    }
    return parsed.data;
};

