import { describe, it, expect, vi } from "vitest";
import { DisplayRegistry } from "./DisplayRegistry";

const mockFallback = {
    display_key: "__default_placeholder",
    moduleStack: [
        {
            id: "mock",
            create: () => ({ id: "mock", tick: () => {}, destroy: () => {} }),
        },
    ],
};

describe("DisplayRegistry", () => {
    it("register and resolve returns registered definition", () => {
        const reg = new DisplayRegistry(mockFallback);
        const def = { display_key: "ship", moduleStack: [] };
        reg.register(def);
        expect(reg.resolve("ship")).toBe(def);
    });

    it("resolve unregistered key returns default placeholder", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const reg = new DisplayRegistry(mockFallback);
        const result = reg.resolve("unknown_key");
        expect(result).toBe(mockFallback);
        expect(result.moduleStack.length).toBeGreaterThan(0);
        spy.mockRestore();
    });

    it("logs once per missing key", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const reg = new DisplayRegistry(mockFallback);
        reg.resolve("missing_a");
        reg.resolve("missing_a");
        reg.resolve("missing_b");

        const calls = spy.mock.calls.filter((c) =>
            String(c[0]).includes("missing_a"),
        );
        expect(calls.length).toBe(1);
        spy.mockRestore();
    });

    it("register overwrites existing definition", () => {
        const reg = new DisplayRegistry(mockFallback);
        const def1 = { display_key: "x", moduleStack: [] };
        const def2 = { display_key: "x", moduleStack: [] };
        reg.register(def1);
        reg.register(def2);
        expect(reg.resolve("x")).toBe(def2);
    });

    it("clear removes all definitions", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const reg = new DisplayRegistry(mockFallback);
        reg.register({ display_key: "y", moduleStack: [] });
        reg.clear();
        const result = reg.resolve("y");
        // After clear, should fall back to default
        expect(result.display_key).not.toBe("y");
        spy.mockRestore();
    });
});
