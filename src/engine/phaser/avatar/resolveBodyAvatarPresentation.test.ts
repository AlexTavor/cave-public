// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { resolveBodyAvatarPresentation } from "./resolveBodyAvatarPresentation";

beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        fillStyle: "#000000",
        globalAlpha: 1,
    })) as any;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(
        () => "data:image/png;base64,avatar",
    );
});

const makeScene = () =>
    ({
        textures: {
            get: (key: string) => ({
                getSourceImage: () => ({ src: `${key}.png` }),
            }),
        },
    }) as any;

const textureManager = {
    getAvatarGlowTexture: () => "glow",
    getAvatarSilhouetteTexture: () => "silhouette",
    getAvatarEyesTexture: () => "eyes",
} as any;

describe("resolveBodyAvatarPresentation", () => {
    it("uses the runtime entity subject seed when available", () => {
        const avatarRegistry = {
            syncEpoch: vi.fn(),
            resolve: vi.fn(() => ({
                appearanceKey: "appearance-1",
                faceShapeIndex: 0,
                hairShapeIndex: 0,
                eyeShapeIndex: 0,
                eyeOffsetY: 0,
                eyeSpacing: 12,
                eyeScaleX: 1,
                eyeScaleY: 1,
                blinkIntervalMs: 3000,
                blinkDurationMs: 120,
                blinkPhaseMs: 0,
            })),
        } as any;
        const runtime = {
            getState: () => ({ seed: "seed-7" }),
            getEntity: (id: string) =>
                id === "worker-1"
                    ? { id, assignment: { assignedIds: ["body-7"] } }
                    : { id },
        } as any;

        const result = resolveBodyAvatarPresentation(
            "worker-1",
            textureManager,
            avatarRegistry,
            makeScene(),
            runtime,
        );

        expect(avatarRegistry.syncEpoch).toHaveBeenCalledWith("seed-7");
        expect(avatarRegistry.resolve).toHaveBeenCalledWith("body-7");
        expect(result?.silhouetteSrc.startsWith("data:image/png")).toBe(true);
    });

    it("falls back to the raw subject id when no runtime entity exists", () => {
        const avatarRegistry = {
            syncEpoch: vi.fn(),
            resolve: vi.fn(() => ({
                appearanceKey: "appearance-2",
                faceShapeIndex: 0,
                hairShapeIndex: 0,
                eyeShapeIndex: 0,
                eyeOffsetY: 0,
                eyeSpacing: 12,
                eyeScaleX: 1,
                eyeScaleY: 1,
                blinkIntervalMs: 3000,
                blinkDurationMs: 120,
                blinkPhaseMs: 0,
            })),
        } as any;

        resolveBodyAvatarPresentation(
            "body-9",
            textureManager,
            avatarRegistry,
            makeScene(),
            {
                getEntity: () => null,
                getState: () => ({ seed: "seed-9" }),
            } as any,
        );

        expect(avatarRegistry.syncEpoch).toHaveBeenCalledWith("seed-9");
        expect(avatarRegistry.resolve).toHaveBeenCalledWith("body-9");
    });
});
