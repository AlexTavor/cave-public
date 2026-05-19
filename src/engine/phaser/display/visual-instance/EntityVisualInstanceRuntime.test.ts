import { describe, expect, it, vi } from "vitest";
import { updateScratchInteraction } from "./EntityVisualInstanceRuntime";

const makeTarget = (hasInput = true) => ({
    input: hasInput ? { enabled: false } : null,
    __interactionHitArea: { radius: 12 },
    __interactionHitTest: vi.fn(),
    setInteractive: vi.fn(function (this: any) {
        this.input = { enabled: true };
    }),
    disableInteractive: vi.fn(function (this: any) {
        if (this.input) this.input.enabled = false;
    }),
});

describe("updateScratchInteraction", () => {
    it("re-enables existing root input without calling setInteractive again", () => {
        const root = makeTarget(true);
        updateScratchInteraction({ root, backgroundImage: null } as any, false);
        expect(root.input?.enabled).toBe(true);
        expect(root.setInteractive).not.toHaveBeenCalled();
    });

    it("restores root interaction when a background image also exists", () => {
        const root = makeTarget(false);
        const backgroundImage = makeTarget(false);
        updateScratchInteraction({ root, backgroundImage } as any, false);
        expect(root.setInteractive).toHaveBeenCalledTimes(1);
        expect(root.setInteractive).toHaveBeenCalledWith(
            root.__interactionHitArea,
            root.__interactionHitTest,
        );
        expect(root.input?.enabled).toBe(true);
        expect(backgroundImage.setInteractive).not.toHaveBeenCalled();
    });

    it("restores root interaction with the stored hit area when input was cleared", () => {
        const root = makeTarget(false);
        updateScratchInteraction({ root, backgroundImage: null } as any, false);
        expect(root.setInteractive).toHaveBeenCalledWith(
            root.__interactionHitArea,
            root.__interactionHitTest,
        );
    });

    it("skips non-interactive roots that never stored a hit area", () => {
        const root = {
            input: null,
            setInteractive: vi.fn(),
            disableInteractive: vi.fn(),
        };

        updateScratchInteraction({ root, backgroundImage: null } as any, false);

        expect(root.setInteractive).not.toHaveBeenCalled();
    });
});
