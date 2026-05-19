import { describe, it, expect } from "vitest";
import { UpdateStateHandler } from "./UpdateStateHandler";
import { RuntimeCommandType } from "../types";
import { createEntity } from "../../test/factories";

const makeContext = (entities: any[]) =>
    ({
        world: { entities, add: () => {}, remove: () => {} },
        cartridge: { blueprints: {}, blueprint: {}, assets: {} },
        impulseEngine: {},
        telemetry: { log: () => {} },
        markEntityListDirty: () => {},
    }) as any;

describe("UpdateStateHandler", () => {
    it("sets state value on existing entity", () => {
        const entity = createEntity("e1", { state: { hp: { value: 10 } } });
        const handler = new UpdateStateHandler();
        const ctx = makeContext([entity]);

        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "hp", value: 5 },
            },
            ctx,
        );

        expect((entity as any).state.hp.value).toBe(5);
    });

    it("clamps value to max when max decreases", () => {
        const entity = createEntity("e1", {
            state: { hp: { value: 80, max: 100 } },
        });
        const handler = new UpdateStateHandler();
        const ctx = makeContext([entity]);

        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "hp", max: 50 },
            },
            ctx,
        );

        expect((entity as any).state.hp.max).toBe(50);
        expect((entity as any).state.hp.value).toBe(50);
    });

    it("scales value proportionally when scaleOnMaxChange is set", () => {
        const entity = createEntity("e1", {
            state: { cycle: { value: 580, max: 600, scaleOnMaxChange: true } },
        });
        const handler = new UpdateStateHandler();
        const ctx = makeContext([entity]);

        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "cycle", max: 100 },
            },
            ctx,
        );

        expect((entity as any).state.cycle.max).toBe(100);
        const scaled = 580 * (100 / 600);
        expect((entity as any).state.cycle.value).toBeCloseTo(scaled, 5);
    });

    it("does not scale when max increases", () => {
        const entity = createEntity("e1", {
            state: { cycle: { value: 50, max: 100, scaleOnMaxChange: true } },
        });
        const handler = new UpdateStateHandler();
        const ctx = makeContext([entity]);

        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "cycle", max: 200 },
            },
            ctx,
        );

        expect((entity as any).state.cycle.max).toBe(200);
        expect((entity as any).state.cycle.value).toBe(50);
    });

    it("clamps without scaling when scaleOnMaxChange is absent", () => {
        const entity = createEntity("e1", {
            state: { res: { value: 90, max: 100 } },
        });
        const handler = new UpdateStateHandler();
        const ctx = makeContext([entity]);

        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: { entityId: "e1", key: "res", max: 60 },
            },
            ctx,
        );

        expect((entity as any).state.res.max).toBe(60);
        expect((entity as any).state.res.value).toBe(60);
    });
});
