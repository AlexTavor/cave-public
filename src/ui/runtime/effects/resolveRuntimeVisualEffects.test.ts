import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { createEntity } from "../../../engine/test/factories";
import { resolveRuntimeVisualEffects } from "./resolveRuntimeVisualEffects";

const physics = (ids: string[]) =>
    ({
        getBody: (id: string) =>
            ids.includes(id) ? { id, x: 10, y: 20, radius: 6 } : undefined,
    }) as any;

describe("resolveRuntimeVisualEffects", () => {
    it("emits spawn effects only for entities tagged with anim:spawn", () => {
        const previous = new Snapshot([], physics([]));
        const current = new Snapshot(
            [
                createEntity("spawned", {
                    blueprintId: "bp-1",
                    tags: ["anim:spawn"],
                }),
                createEntity("plain", { blueprintId: "bp-2", tags: [] }),
            ],
            physics(["spawned", "plain"]),
        );
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.SPAWN,
                    payload: { id: "spawned", blueprintId: "bp-1" },
                },
                {
                    type: RuntimeCommandType.SPAWN,
                    payload: { id: "plain", blueprintId: "bp-2" },
                },
            ] as any,
            previous,
            current,
        );
        expect(effects).toEqual([
            {
                kind: "spawn_gold_rings",
                entityId: "spawned",
                x: 10,
                y: 20,
                radius: 6,
            },
        ]);
    });

    it("emits body death smoke for non-purge body kills", () => {
        const previous = new Snapshot(
            [createEntity("body-1", { body: { health: 1 } })],
            physics(["body-1"]),
        );
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "body-1" },
                },
            ] as any,
            previous,
            new Snapshot([], physics([])),
        );
        expect(effects).toEqual(
            expect.arrayContaining([
                {
                    kind: "kill_smoke_puff",
                    entityId: "body-1",
                    x: 10,
                    y: 20,
                    radius: 6,
                },
            ]),
        );
    });

    it("emits kill effects only for entities tagged with anim:kill", () => {
        const previous = new Snapshot(
            [
                createEntity("dying", { tags: ["[anim:kill]"] }),
                createEntity("plain", { tags: [] }),
            ],
            physics(["dying", "plain"]),
        );
        const current = new Snapshot([], physics([]));
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "dying" },
                },
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "plain" },
                },
            ] as any,
            previous,
            current,
        );
        expect(effects).toEqual([
            {
                kind: "kill_smoke_puff",
                entityId: "dying",
                x: 10,
                y: 20,
                radius: 6,
            },
        ]);
    });
});
