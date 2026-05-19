import { describe, expect, it, vi } from "vitest";
import { AvatarAppearanceRegistry } from "./AvatarAppearanceRegistry";

describe("AvatarAppearanceRegistry", () => {
    it("returns a stable cached appearance within the same epoch", () => {
        const registry = new AvatarAppearanceRegistry();
        registry.syncEpoch("seed-a");

        const first = registry.resolve("body-1");
        const second = registry.resolve("body-1");

        expect(second).toEqual(first);
    });

    it("changes deterministic output when the epoch changes", () => {
        const registry = new AvatarAppearanceRegistry();
        registry.syncEpoch("seed-a");
        const first = registry.resolve("body-1");

        registry.syncEpoch("seed-b");
        const second = registry.resolve("body-1");

        expect(second.appearanceKey).not.toBe(first.appearanceKey);
    });

    it("throws loudly for an empty subject seed", () => {
        const registry = new AvatarAppearanceRegistry();
        const spy = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        expect(() => registry.resolve("   ")).toThrow("Empty subject seed");
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
