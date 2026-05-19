import { describe, it, expect } from "vitest";
import { enqueuePowerSinkUpdate } from "./passiveEffectsPowerSink";
import { RuntimeCommandType } from "../../../engine/runtime/types";

const makeBuffer = () => {
    const commands: any[] = [];
    return {
        enqueue: (cmd: any) => commands.push(cmd),
        drain: () => {
            const res = [...commands];
            commands.length = 0;
            return res;
        },
        clear: () => (commands.length = 0),
        size: () => commands.length,
        commands,
    };
};

describe("enqueuePowerSinkUpdate", () => {
    it("emits baseDemand updates", () => {
        const buffer = makeBuffer();
        enqueuePowerSinkUpdate(
            buffer,
            "e1",
            "self.powerSink.baseDemand.body",
            5,
        );

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_POWER_SINK,
                payload: { entityId: "e1", baseDemand: { body: 5 } },
            },
        ]);
    });

    it("emits maxDemand updates", () => {
        const buffer = makeBuffer();
        enqueuePowerSinkUpdate(
            buffer,
            "e1",
            "self.powerSink.maxDemand.mind",
            3,
        );

        expect(buffer.commands).toEqual([
            {
                type: RuntimeCommandType.UPDATE_POWER_SINK,
                payload: { entityId: "e1", maxDemand: { mind: 3 } },
            },
        ]);
    });

    it("ignores unrecognized powerSink fields", () => {
        const buffer = makeBuffer();
        enqueuePowerSinkUpdate(buffer, "e1", "self.powerSink.throttle.x", 1);

        expect(buffer.commands).toHaveLength(0);
    });

    it("ignores paths without an attribute", () => {
        const buffer = makeBuffer();
        enqueuePowerSinkUpdate(buffer, "e1", "self.powerSink.baseDemand", 1);

        expect(buffer.commands).toHaveLength(0);
    });
});
