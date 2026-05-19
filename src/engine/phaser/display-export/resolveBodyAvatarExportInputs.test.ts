import { describe, expect, it, vi } from "vitest";
const resolveDisplaySpecMock = vi.hoisted(() => vi.fn());

vi.mock("../display/resolve-display/resolveDisplaySpec", () => ({
    resolveDisplaySpec: resolveDisplaySpecMock,
}));

import { resolveBodyAvatarExportInputs } from "./resolveBodyAvatarExportInputs";

const makeScene = (
    entities: Record<string, any>,
    displayKey = "body_avatar",
) => {
    const runtime = {
        getEntity: (id: string) => entities[id],
        getState: () => ({ seed: "seed-1" }),
        getCartridge: () => ({
            blueprints: {
                worker: {
                    id: "worker",
                    components: { display: { display_key: displayKey } },
                },
            },
            assets: { glyphs: {}, styles: {} },
        }),
    };
    return {
        readRuntime: () => runtime,
        textureManager: {},
        displaySystem: {
            glyphRegistry: { syncEpoch: vi.fn() },
            avatarRegistry: {
                syncEpoch: vi.fn(),
                resolve: vi.fn(() => ({ appearanceKey: "ap", eyeScaleX: 1 })),
            },
        },
        textures: { get: vi.fn() },
    } as any;
};

describe("resolveBodyAvatarExportInputs", () => {
    it("resolves body avatar inputs and honors assigned subject seeds", () => {
        resolveDisplaySpecMock.mockReturnValue({
            display_key: "body_avatar",
            glyph_key: "sigil",
        });
        const carrier = {
            id: "carrier-1",
            blueprintId: "worker",
            assignment: { assignedIds: ["body-7"] },
            display: { display_key: "body_avatar" },
        };
        const scene = makeScene({
            "carrier-1": carrier,
            "body-7": { id: "body-7" },
        });
        const result = resolveBodyAvatarExportInputs(scene, "carrier-1");
        expect(result.runtimeSeed).toBe("seed-1");
        expect(result.subjectSeed).toBe("body-7");
        expect(result.glyphKey).toBeNull();
    });

    it("fails when the entity is missing or not a body avatar display", () => {
        resolveDisplaySpecMock.mockReturnValue({
            display_key: "body_avatar",
            glyph_key: null,
        });
        expect(() =>
            resolveBodyAvatarExportInputs(makeScene({}), "missing"),
        ).toThrow(/missing body entity/i);
        resolveDisplaySpecMock.mockReturnValue({
            display_key: "orb",
            glyph_key: null,
        });
        const entity = {
            id: "b1",
            blueprintId: "worker",
            display: { display_key: "orb" },
        };
        expect(() =>
            resolveBodyAvatarExportInputs(
                makeScene({ b1: entity }, "orb"),
                "b1",
            ),
        ).toThrow(/expected body_avatar/i);
    });
});
