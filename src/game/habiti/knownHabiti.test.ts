import { describe, expect, it } from "vitest";
import { readKnownHabiti, readPendingCarrierHabiti } from "./knownHabiti";

describe("knownHabiti", () => {
    it("combines owned habiti with direct gain actions on live carriers", () => {
        const world = { cave: { ownedHabiti: ["alpha"] } } as any;
        const carrier = {
            id: "carrier-1",
            carrier: {
                commands: [
                    { type: "GAIN_HABITI", habitusId: "beta" },
                    {
                        type: "SPAWN_CARRIER",
                        tags: ["carrier"],
                        commands: [{ type: "GAIN_HABITI", habitusId: "ignored" }],
                    },
                ],
            },
        } as any;

        expect(readPendingCarrierHabiti([carrier])).toEqual(["beta"]);
        expect(readKnownHabiti(world, [carrier])).toEqual(["alpha", "beta"]);
    });
});