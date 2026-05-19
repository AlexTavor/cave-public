import { describe, expect, it } from "vitest";
import { Snapshot } from "../../Snapshot";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { createImpulseConfig } from "../../../test/factories";
import type { RuntimeEntity } from "../../types";
import { resolveSmartTarget } from "./targetSelector";

const buildSnapshot = (entities: RuntimeEntity[]) =>
    new Snapshot(entities, new ImpulseEngine(createImpulseConfig()));

describe("resolveSmartTarget permissions", () => {
    it("filters out targets that disallow deposits", () => {
        const seeker: RuntimeEntity = { id: "seeker" };
        const chestA: RuntimeEntity = {
            id: "a",
            tags: ["storage:wood"],
            state: { wood: { value: 9, max: 10, allowDeposit: true } },
        };
        const chestB: RuntimeEntity = {
            id: "b",
            tags: ["storage:wood"],
            state: { wood: { value: 1, max: 10, allowDeposit: false } },
        };
        const snapshot = buildSnapshot([seeker, chestA, chestB]);

        const target = resolveSmartTarget("tag:storage:wood", "wood", {
            self: seeker,
            snapshot,
        });

        expect(target).toBe("a");
    });
});
