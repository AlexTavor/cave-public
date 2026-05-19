import { describe, expect, it } from "vitest";
import { createSession } from "../sessionLogic";
import { applyPersistedDraft } from "./utils";

const makeModule = () => ({
    metadata: { id: "assets", name: "assets", version: "0.0.1" },
    blueprints: {},
    assets: {
        displays: {
            luretraveler: {
                type: "resource",
                styleId: "luretraveler",
                glyphKey: "luretraveler",
            },
            outside: {
                type: "resource",
                styleId: "outside",
                glyphKey: "outside",
            },
        },
        styles: {},
        glyphs: {},
        settings: {},
    },
});

describe("applyPersistedDraft asset merge", () => {
    it("preserves newly added authored asset entries when restoring persisted drafts", () => {
        const session = createSession(
            "modules/assets.art",
            makeModule() as any,
        );
        applyPersistedDraft(
            session as any,
            {
                ...makeModule(),
                assets: {
                    ...makeModule().assets,
                    displays: {
                        luretraveler: {
                            type: "resource",
                            styleId: "edited",
                            glyphKey: "edited",
                        },
                    },
                },
            } as any,
        );

        expect(session.draft.assets.displays.luretraveler.styleId).toBe(
            "edited",
        );
        expect(session.draft.assets.displays.outside.styleId).toBe("outside");
    });
});
