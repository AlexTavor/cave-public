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

describe("resolveRuntimeVisualEffects purge", () => {
    it("emits death smoke and camera shake for purge body kills", () => {
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "body-1" },
                    metadata: { cause: "purge" },
                },
            ] as any,
            new Snapshot(
                [createEntity("body-1", { body: { health: 1 } })],
                physics(["body-1"]),
            ),
            new Snapshot([], physics([])),
        );

        expect(effects).toContainEqual({
            kind: "kill_smoke_puff",
            entityId: "body-1",
            x: 10,
            y: 20,
            radius: 6,
            cause: "purge",
        });
        expect(
            effects.some((event) => event.kind === "body_death_camera_shake"),
        ).toBe(true);
    });
});
