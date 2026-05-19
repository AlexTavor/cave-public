import { describe, it, expect } from "vitest";
import { DisplayPoolRegistry } from "./DisplayPoolRegistry";

describe("DisplayPoolRegistry", () => {
    it("get returns stable per-key pool", () => {
        const reg = new DisplayPoolRegistry();
        const pool1 = reg.get("key_a");
        const pool2 = reg.get("key_a");
        expect(pool1).toBe(pool2);
    });

    it("different keys return different pools", () => {
        const reg = new DisplayPoolRegistry();
        const pool1 = reg.get("key_a");
        const pool2 = reg.get("key_b");
        expect(pool1).not.toBe(pool2);
    });

    it("destroyAll clears all pools", () => {
        const reg = new DisplayPoolRegistry();
        reg.get("key_a");
        reg.get("key_b");
        reg.destroyAll();
        // After destroyAll, getting the same key should return a new pool
        const newPool = reg.get("key_a");
        expect(newPool).toBeDefined();
        expect(newPool.display_key).toBe("key_a");
    });
});
