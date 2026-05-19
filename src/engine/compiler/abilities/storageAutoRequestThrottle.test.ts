import { describe, expect, it } from "vitest";
import { Snapshot } from "../../runtime/Snapshot";
import { RuntimeCommandType } from "../../runtime/types";
import { compileStorageAutoRequest } from "./storageAutoRequestCompiler";
import { createBlueprint } from "../../test/factories";
import { BehaviorSystem } from "../../runtime/systems/BehaviorSystem";

const makeBuffer = () => {
    const commands: any[] = [];
    return {
        commands,
        enqueue: (command: any) => commands.push(command),
        drain: () => [],
        clear: () => undefined,
        size: () => commands.length,
    };
};

const makeEntity = (throttle?: number) => {
    const components: any = {
        state: { food: { value: 0, max: 10, visible: true } },
    };
    if (throttle !== undefined) {
        components.powerSink = {
            baseDemand: { body: 0, mind: 0, social: 0 },
            maxDemand: { body: 0, mind: 0, social: 0 },
            throttle,
            efficiency: 0,
            drawFraction: {},
            allocatedDraw: { body: 0, mind: 0, social: 0 },
            status: "blackout",
        };
    }
    const draft = createBlueprint("store", {
        components,
    });
    compileStorageAutoRequest(
        draft,
        {
            enabled: true,
            cadence_s: 1,
            source: "tag:storage:food",
            minRequest: 1,
            maxRequest: 5,
        },
        "food",
        0,
    );
    return {
        id: "store_1",
        ...draft.components,
        state: {
            ...draft.components.state,
            food: { value: 0, max: 10, visible: true },
            auto_req_food_timer_0: { value: 1, visible: false },
            auto_req_food_need_0: { value: 5, visible: false },
        },
    } as any;
};

const makeSource = () => ({
    id: "source_1",
    tags: ["storage:food"],
    state: { food: { value: 20, max: 20, visible: true } },
});

describe("storage auto-request throttle", () => {
    it("does not request when a throttled powerSink is at zero", () => {
        const buffer = makeBuffer();
        new BehaviorSystem().tick(
            new Snapshot(
                [
                    { id: "sys_world", state: {} } as any,
                    makeSource() as any,
                    makeEntity(0),
                ],
                { getBody: () => undefined } as any,
            ),
            buffer,
            20,
        );
        expect(
            buffer.commands.some(
                (c) => c.type === RuntimeCommandType.TRANSFER_ASSETS,
            ),
        ).toBe(false);
    });

    it("still requests when no powerSink exists", () => {
        const buffer = makeBuffer();
        new BehaviorSystem().tick(
            new Snapshot(
                [
                    { id: "sys_world", state: {} } as any,
                    makeSource() as any,
                    makeEntity(),
                ],
                { getBody: () => undefined } as any,
            ),
            buffer,
            20,
        );
        expect(
            buffer.commands.some(
                (c) => c.type === RuntimeCommandType.TRANSFER_ASSETS,
            ),
        ).toBe(true);
    });
});
