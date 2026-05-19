import { describe, expect, it } from "vitest";
import { parseVirtualPath, serializeVirtualPath } from "./virtualPath";

describe("virtualPath tutorials", () => {
    it("parses and serializes tutorial routes", () => {
        const path = serializeVirtualPath({
            kind: "tutorials",
            filename: "modules/core.cave",
        });
        expect(path).toBe("tutorials::modules/core.cave");
        expect(parseVirtualPath(path)).toEqual({
            kind: "tutorials",
            filename: "modules/core.cave",
        });
    });
});
