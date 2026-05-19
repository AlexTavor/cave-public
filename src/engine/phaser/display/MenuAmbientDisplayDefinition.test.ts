import { describe, expect, it, vi } from "vitest";

const { mockModule } = vi.hoisted(() => ({
    mockModule: (id: string) => ({ id, create: () => ({}) }),
}));

vi.mock("./modules/TransformModule", () => ({
    TransformModule: mockModule("TransformModule"),
}));
vi.mock("./modules/MenuAmbientProximityLightModule", () => ({
    MenuAmbientProximityLightModule: mockModule(
        "MenuAmbientProximityLightModule",
    ),
}));
vi.mock("./modules/GlyphModule", () => ({
    createGlyphModule: () => mockModule("GlyphModule"),
}));
vi.mock("./modules/PulseModule", () => ({
    createPulseModule: () => mockModule("PulseModule"),
}));

import {
    createMenuAmbientDisplayDefinitions,
    MENU_AMBIENT_DISPLAY_VARIANT_COUNT,
} from "./MenuAmbientDisplayDefinition";

describe("createMenuAmbientDisplayDefinitions", () => {
    it("keeps the ambient variant count stable", () => {
        expect(createMenuAmbientDisplayDefinitions({} as any)).toHaveLength(
            MENU_AMBIENT_DISPLAY_VARIANT_COUNT,
        );
    });

    it("builds the ambient module stack in the required order", () => {
        const [definition] = createMenuAmbientDisplayDefinitions({} as any);
        expect(definition.moduleStack.map((module) => module.id)).toEqual([
            "TransformModule",
            "MenuAmbientProximityLightModule",
            "GlyphModule",
            "PulseModule",
        ]);
    });
});
