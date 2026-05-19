import { describe, expect, it } from "vitest";
import { parseVirtualPath, serializeVirtualPath } from "./virtualPath";

describe("virtualPath guidances", () => {
    it("parses and serializes guidances routes", () => {
        const path = serializeVirtualPath({
            kind: "guidances",
            filename: "modules/core.cave",
        });
        expect(path).toBe("guidances::modules/core.cave");
        expect(parseVirtualPath(path)).toEqual({
            kind: "guidances",
            filename: "modules/core.cave",
        });
    });
});
