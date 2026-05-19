import { describe, expect, it } from "vitest";
import { parseVirtualPath, serializeVirtualPath } from "./virtualPath";

describe("virtualPath understanding", () => {
    it("parses and serializes understanding routes", () => {
        const path = serializeVirtualPath({
            kind: "understanding",
            filename: "modules/core.cave",
        });
        expect(path).toBe("understanding::modules/core.cave");
        expect(parseVirtualPath(path)).toEqual({
            kind: "understanding",
            filename: "modules/core.cave",
        });
    });
});
