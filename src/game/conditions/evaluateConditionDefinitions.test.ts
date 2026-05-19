import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateConditionDefinitions } from "./evaluateConditionDefinitions";

const snapshot = (entities: Record<string, unknown>[]) =>
    new Snapshot(entities as any, { getBody: () => undefined } as any);

describe("evaluateConditionDefinitions", () => {
    it("uses the default self for auto definitions", () => {
        const world = snapshot([
            { id: "sys_world" },
            { id: "body", powerSink: { throttle: 0.75 } },
        ]);
        expect(
            evaluateConditionDefinitions(
                world,
                [
                    {
                        id: "ready",
                        label: "Ready",
                        selfDefinition: { kind: "auto" },
                        conditions: [
                            {
                                kind: "fact_threshold",
                                scope: "run",
                                factType: "throttle_level",
                                factAbout: "self",
                                operator: ">",
                                value: 0.5,
                            },
                        ],
                    },
                ] as any,
                { defaultSelf: world.getEntity("body") as any },
            ),
        ).toBe(true);
    });

    it("uses authored self definitions when no override is provided", () => {
        const world = snapshot([
            { id: "sys_world" },
            { id: "slow", powerSink: { throttle: 0.25 } },
            { id: "fast", powerSink: { throttle: 0.75 } },
        ]);
        expect(
            evaluateConditionDefinitions(
                world,
                [
                    {
                        id: "ready",
                        label: "Ready",
                        selfDefinition: { kind: "entity_id", entityId: "fast" },
                        conditions: [
                            {
                                kind: "fact_threshold",
                                scope: "run",
                                factType: "throttle_level",
                                factAbout: "self",
                                operator: ">",
                                value: 0.5,
                            },
                        ],
                    },
                ] as any,
                { defaultSelf: world.getEntity("slow") as any },
            ),
        ).toBe(true);
    });

    it("lets an override self replace the authored self definition", () => {
        const world = snapshot([
            { id: "sys_world" },
            { id: "slow", powerSink: { throttle: 0.25 } },
            { id: "fast", powerSink: { throttle: 0.75 } },
        ]);
        expect(
            evaluateConditionDefinitions(
                world,
                [
                    {
                        id: "ready",
                        label: "Ready",
                        selfDefinition: { kind: "entity_id", entityId: "slow" },
                        conditions: [
                            {
                                kind: "fact_threshold",
                                scope: "run",
                                factType: "throttle_level",
                                factAbout: "self",
                                operator: ">",
                                value: 0.5,
                            },
                        ],
                    },
                ] as any,
                { overrideSelf: world.getEntity("fast") as any },
            ),
        ).toBe(true);
    });
});
