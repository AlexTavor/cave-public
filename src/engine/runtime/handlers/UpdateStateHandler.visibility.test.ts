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

describe("UpdateStateHandler visibility", () => {
    it("preserves true visibility when value changes without visible", () => {
        const entity = createEntity("e1", {
            state: { food: { value: 1, visible: true } },
        });
        new UpdateStateHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "food", value: 2 },
            },
            makeContext([entity]),
        );
        expect((entity as any).state.food.visible).toBe(true);
    });

    it("preserves false visibility when max changes without visible", () => {
        const entity = createEntity("e1", {
            state: { food: { value: 1, max: 5, visible: false } },
        });
        new UpdateStateHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "food", max: 4 },
            },
            makeContext([entity]),
        );
        expect((entity as any).state.food.visible).toBe(false);
    });

    it("creates new entries hidden when visible is omitted", () => {
        const entity = createEntity("e1");
        new UpdateStateHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "food", value: 2 },
            },
            makeContext([entity]),
        );
        expect((entity as any).state.food).toMatchObject({
            value: 2,
            visible: false,
        });
    });
});
