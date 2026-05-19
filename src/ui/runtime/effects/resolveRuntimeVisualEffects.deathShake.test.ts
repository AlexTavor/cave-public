import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { createEntity } from "../../../engine/test/factories";
import { resolveRuntimeVisualEffects } from "./resolveRuntimeVisualEffects";

const physics = (ids: string[]) =>
    ({
        getBody: (id: string) =>
            ids.includes(id) ? { x: 10, y: 20, radius: 6 } : undefined,
    }) as any;
const readShakeCount = (
    effects: ReturnType<typeof resolveRuntimeVisualEffects>,
) => effects.filter((event) => event.kind === "body_death_camera_shake").length;

describe("resolveRuntimeVisualEffects death shake", () => {
    it("emits one shake event for a non-purge body kill", () => {
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
        expect(readShakeCount(effects)).toBe(1);
    });

    it("emits one shake event for purge body kills", () => {
        const previous = new Snapshot(
            [createEntity("body-1", { body: { health: 1 } })],
            physics(["body-1"]),
        );
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "body-1" },
                    metadata: { cause: "purge" },
                },
            ] as any,
            previous,
            new Snapshot([], physics([])),
        );
        expect(readShakeCount(effects)).toBe(1);
    });

    it("emits one shake event for multiple body kills in one batch", () => {
        const previous = new Snapshot(
            [
                createEntity("body-1", { body: { health: 1 } }),
                createEntity("body-2", { body: { health: 1 } }),
            ],
            physics(["body-1", "body-2"]),
        );
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "body-1" },
                },
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "body-2" },
                },
            ] as any,
            previous,
            new Snapshot([], physics([])),
        );
        expect(readShakeCount(effects)).toBe(1);
    });

    it("does not emit a shake event for non-body kills", () => {
        const previous = new Snapshot(
            [createEntity("node-1", {})],
            physics(["node-1"]),
        );
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "node-1" },
                },
            ] as any,
            previous,
            new Snapshot([], physics([])),
        );
        expect(readShakeCount(effects)).toBe(0);
    });
});
