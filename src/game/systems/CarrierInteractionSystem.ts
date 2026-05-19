import type { System } from "../../engine/runtime/systems/System";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { isCarrierEntity } from "../carriers/carrier";
import { executeBehaviorActionList } from "../handlers/executeBehaviorActionList";

const readSelectedEntityId = (world: unknown) => {
    const value = (
        world as { state?: { cave_selected_entity_id?: { value?: unknown } } }
    )?.state?.cave_selected_entity_id?.value;
    return typeof value === "string" && value ? value : null;
};

export class CarrierInteractionSystem implements System {
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ) {
        const selectedId = readSelectedEntityId(
            snapshot.getEntity("sys_world"),
        );
        const selected = selectedId
            ? snapshot.getEntity(selectedId)
            : undefined;
        if (!isCarrierEntity(selected)) return;
        executeBehaviorActionList({
            actions: selected.carrier.commands,
            self: selected,
            snapshot,
            commands,
            sourceLane: "carrier_interaction",
        });
    }
}
