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

const createScene = () => {
    let resize: (() => void) | undefined;
    return {
        cameras: { main: { scrollX: 20, scrollY: 30, zoom: 2 } },
        scale: {
            width: 400,
            height: 300,
            on: vi.fn((_e: string, cb: () => void) => (resize = cb)),
            off: vi.fn(),
            emitResize: () => resize?.(),
        },
    } as any;
};

const createRuntime = (background: unknown, purgeActive = false) =>
    ({
        getAccumulatedTime: () => 500,
        getCartridge: () => ({ assets: { settings: { background } } }),
        getEntity: () => ({ cave: { purge: { isActive: purgeActive } } }),
    }) as unknown as Runtime;

beforeEach(() => {
    createShaderObjectMock.mockReset();
});

describe("BiologicalFogBackground", () => {
    it("does not create fog when disabled", () => {
        const scene = createScene();
        const bg = new BiologicalFogBackground(scene);
        bg.update(createRuntime(DEFAULT_BACKGROUND_CONFIG), 0.4);
        expect(createShaderObjectMock).not.toHaveBeenCalled();
    });

    it("re-parses the same authored object after in-place edits", () => {
        const shader = createShader();
        createShaderObjectMock.mockReturnValue(shader);
        const scene = createScene();
        const bg = new BiologicalFogBackground(scene);
        const authored = { ...DEFAULT_BACKGROUND_CONFIG };
        const runtime = createRuntime(authored);

        bg.update(runtime, 0.4);
        authored.enabled = true;
        authored.base_color = "#ffffff";
        bg.update(runtime, 0.4);

        expect(createShaderObjectMock).toHaveBeenCalledTimes(1);
        expect(shader.setVisible).toHaveBeenCalledWith(true);
        expect(shader.setUniform).toHaveBeenCalledWith("uBaseColor.value.x", 1);
    });

    it("creates one shader, applies uniforms, resizes, and destroys cleanly", () => {
        const shader = createShader();
        createShaderObjectMock.mockReturnValue(shader);
        const scene = createScene();
        const bg = new BiologicalFogBackground(scene);
        const runtime = createRuntime({ enabled: true });

        bg.update(runtime, 0.5);
        bg.update(runtime, 0.75);
        scene.scale.width = 640;
        scene.scale.height = 480;
        scene.scale.emitResize();
        bg.destroy();

        expect(createShaderObjectMock).toHaveBeenCalledTimes(1);
        expect(shader.setVisible).toHaveBeenCalledWith(true);
        expect(shader.setUniform).toHaveBeenCalledWith(
            "uCameraScroll.value.x",
            20,
        );
        expect(shader.setSize).toHaveBeenCalledWith(320, 240);
        expect(shader.setUniform).toHaveBeenCalledWith(
            "uResolution.value.x",
            320,
        );
        expect(shader.setDisplayOrigin).toHaveBeenCalledWith(160, 120);
        expect(shader.setPosition).toHaveBeenCalledWith(160, 120);
        expect(scene.scale.off).toHaveBeenCalledWith(
            "resize",
            expect.any(Function),
        );
        expect(shader.destroy).toHaveBeenCalledTimes(1);
    });
});
