import { describe, expect, it } from "vitest";
import { toModuleCartridge } from "./projectCartridgeAdapter";

describe("toModuleCartridge editor data", () => {
    it("preserves authored blueprint editor abilities for live runtime use", () => {
        const module = toModuleCartridge({
            metadata: { id: "project", version: "0.0.1" },
            blueprints: {
                merchant_of_hommlet: {
                    id: "merchant_of_hommlet",
                    label: "Merchant",
                    tags: ["hommlet_merchant"],
                    components: {
                        display: { label: "Merchant", display_key: "merchant" },
                    },
                    _editor: {
                        abilities: {
                            unifiedBlueprints: [
                                {
                                    tag: "hommlet_merchant",
                                    spawnWhenPeerSpawns: true,
                                },
                            ],
                        },
                    },
                } as never,
            },
            draft: { draftOptions: {}, draftPools: {} },
            assets: { styles: {}, displays: {} },
            config: {
                world: {},
                body: {},
                traits: {},
                habiti: {},
            } as never,
        });

        expect(
            module.blueprints.merchant_of_hommlet._editor?.abilities
                ?.unifiedBlueprints,
        ).toEqual([{ tag: "hommlet_merchant", spawnWhenPeerSpawns: true }]);
    });
});
