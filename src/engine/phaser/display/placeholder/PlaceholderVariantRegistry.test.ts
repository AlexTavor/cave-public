import { describe, it, expect, vi } from "vitest";
import { PlaceholderVariantRegistry } from "./PlaceholderVariantRegistry";

describe("PlaceholderVariantRegistry", () => {
    it("returns deterministic mapping for same key", () => {
        const reg = new PlaceholderVariantRegistry();
        const v1 = reg.get("foo");
        const v2 = reg.get("foo");
        expect(v1).toEqual(v2);
    });

    it("different keys get different variants until exhaustion", () => {
        const reg = new PlaceholderVariantRegistry();
        const seen = new Set<string>();

        // Get variants for several unique keys
        for (let i = 0; i < 8; i++) {
            const v = reg.get(`key_${i}`);
            seen.add(`${v.texture}:${v.rotation}:${v.flipX}`);
        }

        // Should have at least some unique variants
        expect(seen.size).toBeGreaterThan(1);
    });

    it("logs on exhaustion of unique variants", () => {
        const reg = new PlaceholderVariantRegistry();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        // Exhaust all variants by requesting many unique keys
        for (let i = 0; i < 100; i++) {
            reg.get(`unique_key_${i}`);
        }

        // After exhaustion, at least one warn should have been emitted
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it("variant has expected shape", () => {
        const reg = new PlaceholderVariantRegistry();
        const v = reg.get("test_key");
        expect(v).toHaveProperty("texture");
        expect(v).toHaveProperty("rotation");
        expect(v).toHaveProperty("flipX");
        expect(typeof v.rotation).toBe("number");
        expect(typeof v.flipX).toBe("boolean");
    });
});
