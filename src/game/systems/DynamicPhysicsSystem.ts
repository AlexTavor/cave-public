import type { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import type { System } from "../../engine/runtime/systems/System";
import type { PhysicsBody } from "../../engine/physics/impulse/types";
import type { DisplayComponent } from "../../engine/phaser/scenes/gameSceneVisualParsers";

const resolveNumericValue = (entity: RuntimeEntity, path: string): number => {
    if (!path) return 0;

    const cleanPath = path.startsWith("self.") ? path.slice(5) : path;
    const segments = cleanPath.split(".");

    let current: any = entity;
    for (const segment of segments) {
        if (current == null) return 0;
        current = current[segment];
    }

    if (typeof current === "number" && Number.isFinite(current)) return current;

    if (
        current &&
        typeof current === "object" &&
        typeof current.value === "number" &&
        Number.isFinite(current.value)
    ) {
        return current.value;
    }

    return 0;
};

export class DynamicPhysicsSystem implements System {
    public tick(
        snapshot: Snapshot,
        _commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        for (const entity of snapshot.getEntities()) {
            if (!entity.id) continue;

            const display = (entity as any).display as
                | DisplayComponent
                | undefined;
            const config = display?.radius;

            if (!config) continue;

            const body = snapshot.getPhysicsBody(entity.id) as PhysicsBody;
            if (!body) continue;

            this.syncRadius(entity, body, config);
        }
    }

    private syncRadius(
        entity: RuntimeEntity,
        body: PhysicsBody,
        config: NonNullable<DisplayComponent["radius"]>,
    ): void {
        const min = config.min ?? 10;
        const max = config.max ?? min;

        let ratio = 0;
        if (config.valueRef) {
            const current = resolveNumericValue(entity, config.valueRef);
            const limit = config.maxRef
                ? resolveNumericValue(entity, config.maxRef)
                : 0;

            // If a maxRef is provided, use it as denominator; otherwise value is the ratio
            ratio = limit > 0 ? current / limit : current;
        }

        const clampedRatio = Math.max(0, Math.min(1, ratio));
        const targetRadius = min + (max - min) * clampedRatio;

        if (Math.abs(body.radius - targetRadius) > 0.1) {
            body.radius = targetRadius;
        }
    }
}
