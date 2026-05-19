import { describe, it, expect, vi } from "vitest";
import { resolveDisplaySpec } from "./resolveDisplaySpec";

const makeEntity = (overrides: Record<string, any> = {}) => ({
    id: "e1",
    blueprintId: "bp1",
    tags: [],
    state: {},
    display: { display_key: "test_key", label: "Test" },
    ...overrides,
});

const makeBlueprint = (overrides: Record<string, any> = {}) => ({
    id: "bp1",
    components: {
        display: { display_key: "bp_key", label: "BPLabel" },
    },
    ...overrides,
});

const displays = {
    test_key: { type: "body" } as const,
    bp_key: { type: "body" } as const,
    unknown: { type: "body" } as const,
};

describe("resolveDisplaySpec", () => {
    it("entity display overrides blueprint display", () => {
        const entity = makeEntity();
        const blueprint = makeBlueprint();
        const spec = resolveDisplaySpec({
            entity: entity as any,
            blueprint: blueprint as any,
            physics: { x: 10, y: 20, radius: 5 },
            styles: {},
            displays,
            blueprints: {},
        });
        expect(spec).not.toBeNull();
        expect(spec?.display_key).toBe("body_avatar");
    });

    it("falls back to blueprint display when entity has none", () => {
        const entity = makeEntity({ display: undefined });
        const blueprint = makeBlueprint();
        const spec = resolveDisplaySpec({
            entity: entity as any,
            blueprint: blueprint as any,
            physics: { x: 10, y: 20, radius: 5 },
            styles: {},
            displays,
            blueprints: {},
        });
        expect(spec).not.toBeNull();
        expect(spec?.display_key).toBe("body_avatar");
    });

    it("returns null when no display component exists", () => {
        const entity = makeEntity({ display: undefined });
        const spec = resolveDisplaySpec({
            entity: entity as any,
            blueprint: undefined,
            physics: { x: 10, y: 20, radius: 5 },
            styles: {},
            displays,
            blueprints: {},
        });
        expect(spec).toBeNull();
    });

    it("returns null with loud log for empty display_key", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const entity = makeEntity({
            display: { display_key: "", label: "X" },
        });
        const spec = resolveDisplaySpec({
            entity: entity as any,
            blueprint: undefined,
            physics: { x: 10, y: 20, radius: 5 },
            styles: {},
            displays,
            blueprints: {},
        });
        expect(spec).toBeNull();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it("returns spec with hasPhysics false when physics is null", () => {
        const entity = makeEntity();
        const spec = resolveDisplaySpec({
            entity: entity as any,
            blueprint: undefined,
            physics: null,
            styles: {},
            displays,
            blueprints: {},
        });
        expect(spec).not.toBeNull();
        expect(spec?.hasPhysics).toBe(false);
        expect(spec?.x).toBe(0);
        expect(spec?.y).toBe(0);
    });

    it("with physics yields hasPhysics=true and coordinates", () => {
        const entity = makeEntity();
        const spec = resolveDisplaySpec({
            entity: entity as any,
            blueprint: undefined,
            physics: { x: 42, y: 99, radius: 15 },
            styles: {},
            displays,
            blueprints: {},
        });
        expect(spec?.hasPhysics).toBe(true);
        expect(spec?.x).toBe(42);
        expect(spec?.y).toBe(99);
    });
});

