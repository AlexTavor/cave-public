import { describe, expect, it } from "vitest";
import { createEntity } from "../../test/factories";
import { RuntimeCommandType } from "../types";
import { UpdateStateHandler } from "./UpdateStateHandler";

const makeContext = (entities: any[]) =>
    ({
        world: { entities, add: () => {}, remove: () => {} },
        cartridge: { blueprints: {}, blueprint: {}, assets: {} },
        impulseEngine: {},
        telemetry: { log: () => {} },
        markEntityListDirty: () => {},
    }) as any;

describe("UpdateStateHandler preserveValueOnMaxDecrease", () => {
    it("keeps the current value when max shrinks below it", () => {
        const entity = createEntity("e1", {
            state: {
                food: {
                    value: 120,
                    max: 200,
                    preserveValueOnMaxDecrease: true,
                },
            },
        });

        new UpdateStateHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "food", max: 80 },
            },
            makeContext([entity]),
        );

        expect((entity as any).state.food).toMatchObject({
            value: 120,
            max: 80,
            preserveValueOnMaxDecrease: true,
        });
    });
});
