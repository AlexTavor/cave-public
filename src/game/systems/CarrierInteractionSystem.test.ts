import { describe, expect, it } from "vitest";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { CarrierInteractionSystem } from "./CarrierInteractionSystem";
import { createCommandBuffer } from "./testUtils";

describe("CarrierInteractionSystem", () => {
    it("executes carrier commands with carrier interaction provenance", () => {
        const { buffer, commands } = createCommandBuffer();
        new CarrierInteractionSystem().tick(
            {
                getEntity: (id: string) =>
                    ({
                        sys_world: { state: { cave_selected_entity_id: { value: "carrier-1" } } },
                        "carrier-1": { id: "carrier-1", carrier: { commands: [{ type: "GAIN_HABITI", habitusId: "alpha" }, { type: "KILL", entityId: "self" }] } },
                    })[id],
                getEntities: () => [],
            } as any,
            commands as any,
            16,
        );

        expect(buffer).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: RuntimeCommandType.GAIN_HABITI, metadata: { sourceEntityId: "carrier-1", sourceLane: "carrier_interaction" } }),
                expect.objectContaining({ type: RuntimeCommandType.KILL, metadata: { sourceEntityId: "carrier-1", sourceLane: "carrier_interaction" } }),
            ]),
        );
    });
});