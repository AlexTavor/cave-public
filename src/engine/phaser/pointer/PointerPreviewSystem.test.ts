import { describe, expect, it, vi } from "vitest";
import { PointerPreviewSystem } from "./PointerPreviewSystem";

const previewGeometry = vi.hoisted(() => ({
    buildPath: vi.fn(() => [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
    ]),
}));
vi.mock("./pointerPreviewGeometry", () => ({
    buildPointerPreviewPath: previewGeometry.buildPath,
}));

const makeImage = () => ({
    width: 20,
    setTint: vi.fn(),
    setPosition: vi.fn(),
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    destroy: vi.fn(),
});

const makeRope = () => ({
    setVisible: vi.fn(),
    setTexture: vi.fn(),
    setTintFill: vi.fn(),
    setColors: vi.fn(),
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    setPosition: vi.fn(),
    setPoints: vi.fn(),
    setDirty: vi.fn(),
    updateVertices: vi.fn(),
    destroy: vi.fn(),
});

const makeRuntime = (assignedIds: string[], previewBodyId = "body-1") => ({
    getEntity: () => ({
        assignment: { assignedIds },
        state: {
            pointer_pickup_radius: { value: 90 },
            pointer_connection_radius: { value: 180 },
            pointer_target_id: { value: "node-1" },
            pointer_preview_amount: { value: 1 },
            pointer_preview_mode: { value: "power" },
            pointer_preview_body: { value: 1 },
            pointer_preview_mind: { value: 0 },
            pointer_preview_social: { value: 0 },
            pointer_preview_body_id: { value: previewBodyId },
        },
    }),
    getPhysicsBody: (id: string) => ({
        x: id === "body-1" ? 10 : 20,
        y: id === "body-1" ? 11 : 21,
    }),
});

describe("PointerPreviewSystem", () => {
    const makeSystem = () => {
        const carryGlow = makeImage();
        const connectionRing = makeImage();
        const pickupRing = makeImage();
        const previewLine = makeRope();
        const system = new PointerPreviewSystem(
            {
                add: {
                    image: vi
                        .fn()
                        .mockReturnValueOnce(carryGlow)
                        .mockReturnValueOnce(connectionRing)
                        .mockReturnValueOnce(pickupRing),
                    rope: vi.fn(() => previewLine),
                },
            } as any,
            {
                getShapeTexture: vi.fn(() => "shape:circle:#ffffff:none"),
                getGlyphTexture: vi.fn(() => "glyphtex:ring:#ffffff:3"),
                getSolidStripTexture: vi.fn(() => "solid-strip:white:default"),
            } as any,
        );
        return { system, carryGlow, previewLine };
    };

    it("shows carry glow only while the pointer is carrying bodies", () => {
        const { system, carryGlow } = makeSystem();
        system.update(makeRuntime(["body-1"]) as any, 0);
        expect(carryGlow.setVisible).toHaveBeenCalledWith(true);
        carryGlow.setVisible.mockClear();
        system.update(makeRuntime([]) as any, 0);
        expect(carryGlow.setVisible).toHaveBeenCalledWith(false);
    });

    it("draws the preview rope from the chosen preview body only", () => {
        const { system, previewLine } = makeSystem();
        system.update(makeRuntime(["body-1"]) as any, 12);
        expect(previewGeometry.buildPath).toHaveBeenCalledWith(
            expect.objectContaining({ fromX: 10, fromY: 11, toX: 20, toY: 21 }),
        );
        expect(previewLine.setPoints).toHaveBeenCalled();
    });

    it("hides the preview rope when there is no preview source body", () => {
        const { system, previewLine } = makeSystem();
        system.update(makeRuntime(["body-1"], "") as any, 0);
        expect(previewLine.setPoints).not.toHaveBeenCalled();
        expect(previewLine.setVisible).toHaveBeenCalledWith(false);
    });
});
