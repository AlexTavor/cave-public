import type { System } from "../../engine/runtime/systems/System";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { BodyComponent } from "../../data/schemas/game/body";
import { isPoolContributingBody } from "./poolContributors";

const POWER_KEYS = {
    body: "power_body",
    mind: "power_mind",
    social: "power_social",
} as const;

const resolveEfficiency = (body: BodyComponent): number => {
    const health = body.health;
    const maxHealth = body.maxHealth;
    if (!Number.isFinite(health) || !Number.isFinite(maxHealth)) return 1;
    if (!maxHealth || maxHealth <= 0) return 1;
    return Math.max(0, Math.min(1, health / maxHealth));
};

const calculateGlobalTotals = (
    bodies: Array<RuntimeEntity & { body: BodyComponent }>,
) => {
    const totals = { body: 0, mind: 0, social: 0 };
    for (const entity of bodies) {
        const attrs = entity.body.attributes;
        if (!attrs) continue;
        const efficiency = resolveEfficiency(entity.body);
        totals.body += Math.ceil((attrs.body ?? 0) * efficiency);
        totals.mind += Math.ceil((attrs.mind ?? 0) * efficiency);
        totals.social += Math.ceil((attrs.social ?? 0) * efficiency);
    }
    return totals;
};

export class AttributePoolSystem implements System {
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        const world = snapshot.getEntity("sys_world") as
            | { state?: Record<string, { value?: number }> }
            | undefined;
        if (!world) return;
        const bodies = snapshot
            .getEntities()
            .filter((entity) => isPoolContributingBody(entity)) as Array<
            RuntimeEntity & { body: BodyComponent }
        >;

        const totals = calculateGlobalTotals(bodies);

        this.syncWorldState(world, commands, POWER_KEYS.body, totals.body);
        this.syncWorldState(world, commands, POWER_KEYS.mind, totals.mind);
        this.syncWorldState(world, commands, POWER_KEYS.social, totals.social);
    }

    private syncWorldState(
        world: { state?: Record<string, { value?: number }> },
        commands: CommandBuffer<RuntimeCommand>,
        key: string,
        value: number,
    ) {
        const currentValue = world.state?.[key]?.value;
        if (currentValue === value) return;

        commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_world",
                key,
                value,
                visible: true,
            },
        });
    }
}

