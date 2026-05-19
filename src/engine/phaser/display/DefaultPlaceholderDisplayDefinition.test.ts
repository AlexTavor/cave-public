import { describe, expect, it, vi } from "vitest";

vi.mock("./modules/TransformModule", () => ({
    TransformModule: { id: "TransformModule", create: () => ({}) },
}));
vi.mock("./modules/light/LightModule", () => ({
    LightModule: { id: "LightModule", create: () => ({}) },
}));
vi.mock("./modules/glyph/GlyphModule", () => ({
    createGlyphModule: () => ({ id: "GlyphModule", create: () => ({}) }),
}));
vi.mock("./modules/interaction/InteractionModule", () => ({
    InteractionModule: { id: "InteractionModule", create: () => ({}) },
}));
vi.mock("./modules/selection/SelectionModule", () => ({
    SelectionModule: { id: "SelectionModule", create: () => ({}) },
}));
vi.mock("./modules/cycle-progress/CycleProgressModule", () => ({
    CycleProgressModule: { id: "CycleProgressModule", create: () => ({}) },
}));

import { createDefaultPlaceholderDefinition } from "./DefaultPlaceholderDisplayDefinition";

describe("createDefaultPlaceholderDefinition", () => {
    it("includes LightModule for producer-style placeholder nodes", () => {
        const def = createDefaultPlaceholderDefinition({} as never);
        expect(def.moduleStack.map((module) => module.id)).toContain(
            "LightModule",
        );
    });
});
