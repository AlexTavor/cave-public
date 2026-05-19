import { describe, expect, it } from "vitest";
import { parseVirtualPath, serializeVirtualPath } from "./virtualPath";

describe("virtualPath camera_world", () => {
    it("round-trips the camera_world route", () => {
        const path = serializeVirtualPath({
            kind: "camera_world",
            filename: "modules/core.cave",
        });

        expect(path).toBe("camera_world::modules/core.cave");
        expect(parseVirtualPath(path)).toEqual({
            kind: "camera_world",
            filename: "modules/core.cave",
        });
    });
});
