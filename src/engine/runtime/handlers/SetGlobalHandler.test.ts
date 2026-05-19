import { describe, expect, it } from "vitest";
import { createEntity } from "../../test/factories";
import { RuntimeCommandType } from "../types";
import { SetGlobalHandler } from "./SetGlobalHandler";

const makeContext = (entities: any[]) =>
    ({
        world: { entities, add: () => {}, remove: () => {} },
        cartridge: { blueprints: {}, blueprint: {}, assets: {} },
        impulseEngine: {},
        telemetry: { log: () => {} },
        markEntityListDirty: () => {},
    }) as any;

describe("SetGlobalHandler", () => {
    it("preserves existing true visibility when visible is omitted", () => {
        const world = createEntity("sys_world", {
            state: { food: { value: 1, visible: true } },
        });
        new SetGlobalHandler().handle(
            {
                type: RuntimeCommandType.SET_GLOBAL,
                payload: { key: "food", value: 2 },
            } as any,
            makeContext([world]),
        );
        expect((world as any).state.food.visible).toBe(true);
    });

    it("preserves existing false visibility when visible is omitted", () => {
        const world = createEntity("sys_world", {
            state: { food: { value: 1, visible: false } },
        });
        new SetGlobalHandler().handle(
            {
                type: RuntimeCommandType.SET_GLOBAL,
                payload: { key: "food", value: 2 },
            } as any,
            makeContext([world]),
        );
        expect((world as any).state.food.visible).toBe(false);
    });

    it("creates new entries hidden when visible is omitted", () => {
        const world = createEntity("sys_world");
        new SetGlobalHandler().handle(
            {
                type: RuntimeCommandType.SET_GLOBAL,
                payload: { key: "food", value: 2 },
            } as any,
            makeContext([world]),
        );
        expect((world as any).state.food).toMatchObject({
            value: 2,
            visible: false,
        });
    });
});
