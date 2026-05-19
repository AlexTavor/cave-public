import { describe, expect, it, vi } from "vitest";

const { mockModule } = vi.hoisted(() => ({
    mockModule: (id: string) => ({ id, create: () => ({}) }),
}));

vi.mock("./modules/VeinsModule", () => ({
    VeinsModule: mockModule("VeinsModule"),
}));
vi.mock("./modules/TransformModule", () => ({
    TransformModule: mockModule("TransformModule"),
}));
vi.mock("./modules/glyph/GlyphModule", () => ({
    createGlyphModule: () => mockModule("GlyphModule"),
}));
vi.mock("./modules/progress-bar/ProgressBarsModule", () => ({
    createProgressBarsModule: () => mockModule("ProgressBarsModule"),
}));
vi.mock("./modules/avatar/AvatarModule", () => ({
    createAvatarModule: () => mockModule("AvatarModule"),
}));
vi.mock("./modules/light/LightModule", () => ({
    LightModule: mockModule("LightModule"),
}));
vi.mock("./modules/selection/SelectionModule", () => ({
    SelectionModule: mockModule("SelectionModule"),
}));
vi.mock("./modules/distress/DistressModule", () => ({
    DistressModule: mockModule("DistressModule"),
}));
vi.mock("./modules/interaction/InteractionModule", () => ({
    InteractionModule: mockModule("InteractionModule"),
}));
vi.mock("./modules/cycle-progress/CycleProgressModule", () => ({
    CycleProgressModule: mockModule("CycleProgressModule"),
}));
vi.mock("./modules/cave/CaveBackgroundModule", () => ({
    CaveBackgroundModule: mockModule("CaveBackgroundModule"),
}));
vi.mock("./modules/cave/CaveEyesModule", () => ({
    CaveEyesModule: mockModule("CaveEyesModule"),
}));
vi.mock("./MenuAmbientDisplayDefinition", () => ({
    createMenuAmbientDisplayDefinitions: () => [],
}));

import { createDisplayDefinitions } from "./DisplayDefinitionCatalog";

describe("createDisplayDefinitions", () => {
    it("keeps body avatars glyph-free", () => {
        const defs = createDisplayDefinitions({} as any, {} as any);
        expect(
            defs
                .find((def) => def.display_key === "body_avatar")
                ?.moduleStack.map((module) => module.id),
        ).not.toContain("AvatarGlyphModule");
    });

    it("uses the dedicated shape stack for attribute pools", () => {
        const defs = createDisplayDefinitions({} as any, {} as any);
        const generic = defs.find((def) => def.display_key === "generic_node");
        const body = defs.find((def) => def.display_key === "attr_body");
        const mind = defs.find((def) => def.display_key === "attr_mind");
        const social = defs.find((def) => def.display_key === "attr_social");
        expect(generic?.moduleStack).toBe(body?.moduleStack);
        expect(body?.moduleStack.map((module) => module.id)).toEqual([
            "TransformModule",
            "LightModule",
            "CycleProgressModule",
            "GlyphModule",
            "ProgressBarsModule",
            "InteractionModule",
            "SelectionModule",
        ]);
        expect(mind?.moduleStack).toBe(body?.moduleStack);
        expect(social?.moduleStack).toBe(body?.moduleStack);
        expect(body?.moduleStack.map((module) => module.id)).not.toContain(
            "DistressModule",
        );
    });

    it("does not register deprecated transfer display definitions", () => {
        const defs = createDisplayDefinitions({} as any, {} as any);
        const transfer = defs.find((def) => def.display_key === "transfer");
        const alias = defs.find((def) => def.display_key === "transfer_wood");
        expect(transfer).toBeUndefined();
        expect(alias).toBeUndefined();
    });
});
