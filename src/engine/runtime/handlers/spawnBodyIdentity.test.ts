import { describe, expect, it } from "vitest";
import { createCartridge } from "../../test/factories";
import { makeHandlerContext } from "./handlerTestUtils";
import { ensureSpawnedBodyIdentity } from "./spawnBodyIdentity";
import type {
    BodyHabitiAssigner,
    BodyHabitiAssignerInput,
} from "./bodyHabitiAssigner";

const createHabitiCartridge = () =>
    createCartridge("core.json", {
        config: {
            habiti: {
                chosen: {
                    id: "chosen",
                    label: "Chosen",
                    type: "unique_body",
                    effects: [],
                    excludes: [],
                },
            },
            settings: {
                body: {
                    habitusTypeRules: [
                        {
                            habitusType: "unique_body",
                            probability: 1,
                            maxCount: 1,
                            weightedPool: [{ habitusId: "chosen", weight: 1 }],
                        },
                    ],
                },
            },
        },
    });

// The habitus RULES (eligibility, maxCount, weighted pools, worldSeed
// determinism) are the injected assigner's job and are covered by
// src/game/habiti/assignBodyHabiti.*.test.ts. These tests cover what the engine
// spawn path itself owns: assembling the assigner input, the change-diff, and
// the graceful no-op when no assigner is wired.
describe("spawnBodyIdentity", () => {
    it("assembles the assigner input and returns its habiti as pending, without mutating the body", () => {
        const context = makeHandlerContext(createHabitiCartridge());
        context.world.add({ id: "sys_world", state: {} } as any);
        const calls: BodyHabitiAssignerInput[] = [];
        const assigner: BodyHabitiAssigner = (input) => {
            calls.push(input);
            return ["chosen"];
        };
        context.assignBodyHabiti = assigner;
        const body = { passport: { name: "" } } as any;

        const pendingHabiti = ensureSpawnedBodyIdentity(body, "body-1", context);

        expect(body.passport.identitySerial).toBe(1);
        expect(body.passport.avatarDisplayKey).toBe("body_avatar:1");
        expect(body.passport.name.trim()).not.toBe("");
        expect(pendingHabiti).toEqual(["chosen"]);
        expect(body.habiti).toBeUndefined();

        // The engine builds the input from the passport serial + cartridge data.
        expect(calls[0]?.identitySerial).toBe(1);
        expect(calls[0]?.habitusIndex).toHaveProperty("chosen");
        expect(calls[0]?.settings?.habitusTypeRules?.[0]?.habitusType).toBe(
            "unique_body",
        );
    });

    it("returns null when the assigner's habiti equal the body's existing habiti", () => {
        const context = makeHandlerContext(createHabitiCartridge());
        context.world.add({ id: "sys_world", state: {} } as any);
        context.assignBodyHabiti = () => ["chosen"];
        const body = {
            passport: { name: "Stable", identitySerial: 7 },
            habiti: ["chosen"],
        } as any;

        const pendingHabiti = ensureSpawnedBodyIdentity(body, "body-7", context);

        expect(pendingHabiti).toBeNull();
        expect(body.habiti).toEqual(["chosen"]);
    });

    it("leaves habiti unchanged and still generates identity when no assigner is wired", () => {
        const context = makeHandlerContext(createHabitiCartridge());
        context.world.add({ id: "sys_world", state: {} } as any);
        // context.assignBodyHabiti intentionally left unset.
        const body = {
            passport: { name: "Stable", identitySerial: 4 },
            habiti: ["man"],
        } as any;

        const pendingHabiti = ensureSpawnedBodyIdentity(body, "body-4", context);

        expect(pendingHabiti).toBeNull();
        expect(body.habiti).toEqual(["man"]);
        expect(body.passport.avatarDisplayKey).toBe("body_avatar:4");
    });
});
