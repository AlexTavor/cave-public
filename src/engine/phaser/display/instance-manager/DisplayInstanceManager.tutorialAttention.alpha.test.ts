import { describe, expect, it, vi } from "vitest";
import {
    applyTutorialAttentionToInstance,
    CONDITIONAL_LOCK_ALPHA,
} from "./DisplayInstanceManager.tutorialAttention";

describe("DisplayInstanceManager tutorial attention alpha", () => {
    it("dims root layers and light-suppresses non-focused instances", () => {
        const backgroundAnchor = { setAlpha: vi.fn() };
        const root = { setAlpha: vi.fn() };
        const effectsAnchor = { setAlpha: vi.fn() };
        const overlayAnchor = { setAlpha: vi.fn() };
        const instance = {
            scratch: { backgroundAnchor, root, effectsAnchor, overlayAnchor },
            clearTutorialDeemphasis: vi.fn(),
            applyTutorialDeemphasis: vi.fn(),
            setTutorialInteractionBlocked: vi.fn(),
            setAttentionLightSuppressed: vi.fn(),
        } as any;
        const runtime = {
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
            runtime,
            { state: {} },
            "other",
            instance,
        );

        expect(backgroundAnchor.setAlpha).toHaveBeenCalledWith(0.35);
        expect(root.setAlpha).toHaveBeenCalledWith(0.35);
        expect(effectsAnchor.setAlpha).toHaveBeenCalledWith(0.35);
        expect(overlayAnchor.setAlpha).toHaveBeenCalledWith(0.35);
        expect(instance.setAttentionLightSuppressed).toHaveBeenCalledWith(true);
    });

    it("dims conditionally locked instances without tutorial focus", () => {
        const backgroundAnchor = { setAlpha: vi.fn() };
        const backgroundImage = { setAlpha: vi.fn() };
        const root = { setAlpha: vi.fn() };
        const instance = {
            scratch: { backgroundAnchor, backgroundImage, root },
            clearTutorialDeemphasis: vi.fn(),
            applyTutorialDeemphasis: vi.fn(),
            setTutorialInteractionBlocked: vi.fn(),
            setAttentionLightSuppressed: vi.fn(),
        } as any;
        const runtime = { getEntity: () => ({ state: {} }) } as any;

        applyTutorialAttentionToInstance(
            runtime,
            {
                state: {
                    conditional_activation_cycle_hide_throttle: { value: true },
                },
            },
            "locked",
            instance,
        );

        expect(backgroundAnchor.setAlpha).toHaveBeenCalledWith(
            CONDITIONAL_LOCK_ALPHA,
        );
        expect(backgroundImage.setAlpha).toHaveBeenCalledWith(
            CONDITIONAL_LOCK_ALPHA,
        );
        expect(root.setAlpha).toHaveBeenCalledWith(CONDITIONAL_LOCK_ALPHA);
    });
});
