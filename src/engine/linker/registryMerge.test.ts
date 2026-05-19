import { describe, expect, it, vi } from "vitest";
import { mergeRegistry } from "./registryMerge";

describe("mergeRegistry", () => {
    it("adds new ids and replaces existing ids", () => {
        const onCollision = vi.fn();
        const merged = mergeRegistry(
            {
                "a::one": { id: "a::one", label: "one" },
                "a::two": { id: "a::two", label: "two" },
            } as any,
            {
                "a::two": { id: "a::two", label: "two v2" },
                "a::three": { id: "a::three", label: "three" },
            } as any,
            onCollision,
        );

        expect(merged["a::one"].label).toBe("one");
        expect(merged["a::two"].label).toBe("two v2");
        expect(merged["a::three"].label).toBe("three");
        expect(onCollision).toHaveBeenCalledWith("a::two");
    });
});
