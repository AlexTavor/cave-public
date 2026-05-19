import { describe, expect, it } from "vitest";
import { createCartridge } from "../../test/factories";
import { makeHandlerContext } from "./handlerTestUtils";
import { ensureSpawnedBodyIdentity } from "./spawnBodyIdentity";

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

describe("spawnBodyIdentity", () => {
    it("generates passport identity and returns pending Habiti without mutating the body", () => {
        const context = makeHandlerContext(createHabitiCartridge());
        context.world.add({ id: "sys_world", state: {} } as any);
        const body = { passport: { name: "" } } as any;

        const pendingHabiti = ensureSpawnedBodyIdentity(
            body,
            "body-1",
            context,
        );

        expect(body.passport.identitySerial).toBe(1);
        expect(body.passport.avatarDisplayKey).toBe("body_avatar:1");
        expect(body.passport.name.trim()).not.toBe("");
        expect(pendingHabiti).toEqual(["chosen"]);
        expect(body.habiti).toBeUndefined();
    });

    it("returns null when the computed Habiti are unchanged", () => {
        const context = makeHandlerContext(createHabitiCartridge());
        context.world.add({ id: "sys_world", state: {} } as any);
        const body = {
            passport: { name: "Stable", identitySerial: 7 },
            habiti: ["chosen"],
        } as any;

        const pendingHabiti = ensureSpawnedBodyIdentity(
            body,
            "body-7",
            context,
        );

        expect(pendingHabiti).toBeNull();
        expect(body.habiti).toEqual(["chosen"]);
    });

    it("does not add a second gender when existing habiti already satisfy maxCount", () => {
        const context = makeHandlerContext(
            createCartridge("core.json", {
                config: {
                    habiti: {
                        man: {
                            id: "man",
                            label: "Man",
                            type: "gender",
                            effects: [],
                            excludes: [],
                        },
                        woman: {
                            id: "woman",
                            label: "Woman",
                            type: "gender",
                            effects: [],
                            excludes: [],
                        },
                    },
                    settings: {
                        body: {
                            habitusTypeRules: [
                                {
                                    habitusType: "gender",
                                    probability: 1,
                                    maxCount: 1,
                                    weightedPool: [
                                        { habitusId: "woman", weight: 1 },
                                    ],
                                },
                            ],
                        },
                    },
                },
            }),
        );
        context.world.add({ id: "sys_world", state: {} } as any);

        expect(
            ensureSpawnedBodyIdentity(
                {
                    passport: { name: "Stable", identitySerial: 4 },
                    habiti: ["man"],
                } as any,
                "body-4",
                context,
            ),
        ).toBeNull();
    });
});
