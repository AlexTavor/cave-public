import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Runtime } from "../../runtime/Runtime";
import { DEFAULT_BACKGROUND_CONFIG } from "../../../data/schemas/assets";
import { BiologicalFogBackground } from "./BiologicalFogBackground";

const createShaderObjectMock = vi.fn();

vi.mock("./createBiologicalFogShaderObject", () => ({
    createBiologicalFogShaderObject: (...args: unknown[]) =>
        createShaderObjectMock(...args),
}));

const createShader = () => ({
    setVisible: vi.fn().mockReturnThis(),
    setUniform: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(),
    setDisplayOrigin: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
});
const createScene = () =>
    ({
        cameras: { main: { scrollX: 0, scrollY: 0, zoom: 1 } },
        scale: { width: 400, height: 300, on: vi.fn(), off: vi.fn() },
    }) as any;
const createRuntime = (purgeActive: boolean) =>
    ({
        getAccumulatedTime: () => 500,
        getCartridge: () => ({
            assets: {
                settings: {
                    background: { ...DEFAULT_BACKGROUND_CONFIG, enabled: true },
                },
            },
        }),
        getEntity: () => ({ cave: { purge: { isActive: purgeActive } } }),
    }) as unknown as Runtime;

describe("BiologicalFogBackground Purge", () => {
    beforeEach(() => createShaderObjectMock.mockReset());

    it("uses a red-shifted base color while Purge is active", () => {
        const shader = createShader();
        createShaderObjectMock.mockReturnValue(shader);
        new BiologicalFogBackground(createScene()).update(
            createRuntime(true),
            1,
        );
        expect(shader.setUniform).toHaveBeenCalledWith(
            "uBaseColor.value.x",
            0.79,
        );
        expect(shader.setUniform).toHaveBeenCalledWith(
            "uBaseColor.value.y",
            0.48666666666666664,
        );
    });

    it("keeps the authored base color when Purge is inactive", () => {
        const shader = createShader();
        createShaderObjectMock.mockReturnValue(shader);
        new BiologicalFogBackground(createScene()).update(
            createRuntime(false),
            1,
        );
        expect(shader.setUniform).toHaveBeenCalledWith(
            "uBaseColor.value.x",
            192 / 255,
        );
    });
});
