import { describe, expect, it } from "vitest";
import { toModuleCartridge } from "./projectCartridgeAdapter";
import type { RuntimeCartridge } from "../../linker/types";
import { BodySettingsSchema } from "../../../data/schemas/game/habiti";

describe("toModuleCartridge", () => {
    it("maps guidance tutorial config into blueprint settings", () => {
        const runtime: RuntimeCartridge = {
            metadata: { id: "project", version: "0.0.1" },
            blueprints: {},
            draft: { draftOptions: {}, draftPools: {} },
            assets: {
                styles: {},
                displays: {},
                glyphs: {
                    egg: {
                        placements: [
                            {
                                shape: "ring",
                                position: 4,
                                rotationDeg: 0,
                                scale: 1,
                                colorHex: "#12abef",
                                radialPositionFactor: 1,
                            },
                        ],
                        pulse: {
                            distanceFromCenterMinFactor: 0.4,
                            distanceFromCenterMaxFactor: 0.8,
                            scalePulseMin: 0.9,
                            scalePulseMax: 1.1,
                            rotationDeltaMinDeg: -5,
                            rotationDeltaMaxDeg: 5,
                            delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
                        },
                    },
                },
            } as RuntimeCartridge["assets"],
            config: {
                impulse: {} as any,
                game_config: {} as any,
                traits: {},
                habiti: {},
                pointer: {},
                world: {},
                body: BodySettingsSchema.parse({}),
                carrier: { displayId: "egg", radius: 12 },
                conditions: [
                    {
                        id: "cond_intro",
                        label: "Intro Seen",
                        selfDefinition: { kind: "auto" },
                        conditions: [
                            {
                                id: "cond-row-1",
                                sortKey: "01COND",
                                kind: "world_state_boolean",
                                key: "intro_seen",
                                value: true,
                            },
                        ],
                    },
                ],
                guidances: [
                    {
                        id: "intro",
                        presentation: "modal",
                        attention: [],
                        imageUrl: null,
                        title: "",
                        text: "Wake up.",
                    },
                ],
                tutorials: [
                    {
                        id: "throttle",
                        selfDefinition: { kind: "auto" },
                        enterConditionIds: [],
                        guidances: [{ guidanceId: "intro" }],
                        onComplete: [],
                        exitConditionIds: [],
                    },
                ],
                knowledge: [
                    {
                        id: "intro_knowledge",
                        guidanceId: "intro",
                        label: "Intro",
                        description: "",
                        unlockConditionIds: [],
                    },
                ],
            },
        };

        const module = toModuleCartridge(runtime);

        expect(module.config?.settings.guidances?.[0].id).toBe("intro");
        expect(module.config?.settings.tutorials?.[0].id).toBe("throttle");
        expect(module.config?.settings.knowledge?.[0].id).toBe(
            "intro_knowledge",
        );
        expect(module.assets.glyphs?.egg).toMatchObject({
            placements: [{ position: 4, colorHex: "#12abef" }],
        });
    });
});

