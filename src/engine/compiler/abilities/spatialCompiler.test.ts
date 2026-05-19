import { describe, it, expect } from "vitest";
import { spatialCompiler } from "./spatialCompiler";
import { createBlueprint } from "../../test/factories";
import { resolveAuthoredWorldPosition } from "../../../data/schemas/v2/worldPositionDefaults";

describe("spatialCompiler", () => {
    it("creates physics component when absent", () => {
        const draft = createBlueprint("test", { components: {} });
        const config = { x: 100, y: 200, radius: { min: 10, max: 30 } };
        const position = resolveAuthoredWorldPosition(100, 200);
        spatialCompiler(draft, config);
        expect(draft.components.physics).toEqual({
            mass: 1,
            radius: 30,
            drag: 0.1,
            isStatic: true,
            x: position.x,
            y: position.y,
        });
    });

    it("patches existing physics component", () => {
        const draft = createBlueprint("test", {
            components: {
                physics: {
                    mass: 50,
                    radius: 5,
                    drag: 0.5,
                    isStatic: true,
                    x: 0,
                    y: 0,
                },
            },
        });
        const config = { x: 300, y: 400, radius: { min: 10, max: 40 } };
        const position = resolveAuthoredWorldPosition(300, 400);
        spatialCompiler(draft, config);
        expect(draft.components.physics).toMatchObject({
            mass: 50,
            drag: 0.5,
            isStatic: true,
            x: position.x,
            y: position.y,
            radius: 40,
        });
    });

    it("sets spatial component from config", () => {
        const draft = createBlueprint("test", { components: {} });
        const config = { x: 50, y: 75, radius: { min: 5, max: 15 } };
        const position = resolveAuthoredWorldPosition(50, 75);
        spatialCompiler(draft, config);
        expect(draft.components.spatial).toEqual({
            x: position.x,
            y: position.y,
            radius: { min: 5, max: 15 },
        });
    });

    it("patches display radius when display exists", () => {
        const draft = createBlueprint("test", {
            components: { display: { label: "X", display_key: "i" } },
        });
        const config = { x: 0, y: 0, radius: { min: 8, max: 20 } };
        spatialCompiler(draft, config);
        expect(draft.components.display?.radius).toEqual({
            min: 8,
            max: 20,
        });
    });

    it("adds physics for body blueprints", () => {
        const draft = createBlueprint("test", {
            tags: ["body"],
            components: {},
        });
        const config = { x: 100, y: 200, radius: { min: 10, max: 30 } };
        const position = resolveAuthoredWorldPosition(100, 200);
        spatialCompiler(draft, config);
        expect(draft.components.physics).toMatchObject({
            x: position.x,
            y: position.y,
            radius: 30,
        });
        expect(draft.components.spatial).toEqual({
            x: position.x,
            y: position.y,
            radius: { min: 10, max: 30 },
        });
    });

    it("uses default radius when worldPresence is incomplete", () => {
        const draft = createBlueprint("test", { components: {} });
        const position = resolveAuthoredWorldPosition(1, 2);
        spatialCompiler(draft, { x: 1, y: 2 } as any);
        expect(draft.components.spatial).toEqual({
            x: position.x,
            y: position.y,
            radius: { min: 10, max: 20 },
        });
        expect(draft.components.physics?.radius).toBe(20);
    });
});

