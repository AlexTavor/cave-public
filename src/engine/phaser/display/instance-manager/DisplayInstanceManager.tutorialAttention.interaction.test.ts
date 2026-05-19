import { describe, expect, it, vi } from "vitest";
import { applyTutorialAttentionToInstance } from "./DisplayInstanceManager.tutorialAttention";

const createTarget = () => ({
    input: { enabled: true },
    disableInteractive: vi.fn(),
    setAlpha: vi.fn(),
});

describe("DisplayInstanceManager tutorial attention interaction", () => {
    it("blocks and restores root interaction when backgroundImage also exists", () => {
        const root = createTarget();
        const backgroundImage = createTarget();
        const instance = {
            scratch: { root, backgroundImage },
            clearTutorialDeemphasis: vi.fn(),
            applyTutorialDeemphasis: vi.fn(),
            setTutorialInteractionBlocked: vi.fn(),
            setAttentionLightSuppressed: vi.fn(),
        } as any;
        const blockedRuntime = {
            getEntity: () => ({
                tutorial: {
                    active: true,
                    attention: {
                        focusEntityIds: ["focused"],
                        blockNonFocusedInteraction: true,
                    },
                },
            }),
        } as any;

        applyTutorialAttentionToInstance(
            blockedRuntime,
            { state: {} },
            "other",
            instance,
        );

        expect((root as any).__tutorialInteractionBlocked).toBe(true);
        expect(root.input.enabled).toBe(false);
        expect(
            (backgroundImage as any).__tutorialInteractionBlocked,
        ).toBeUndefined();
        expect(backgroundImage.input.enabled).toBe(true);

        applyTutorialAttentionToInstance(
            {
                getEntity: () => ({
                    tutorial: { active: false, attention: {} },
                }),
            } as any,
            { state: {} },
            "other",
            instance,
        );

        expect((root as any).__tutorialInteractionBlocked).toBe(false);
        expect(root.input.enabled).toBe(true);
    });
});
