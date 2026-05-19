import { describe, expect, it, vi } from "vitest";
import { resolveVfsPath } from "./resolveVfsPath";

const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => [
        "cave_roguelite_gdd_v2/modules/core.cave",
        "cave_roguelite_gdd_v2/modules/progression.draft",
    ]),
}));

vi.mock("../../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));

describe("resolveVfsPath", () => {
    it("resolves project-relative paths via suffix match", async () => {
        await expect(resolveVfsPath("modules/core.cave")).resolves.toBe(
            "cave_roguelite_gdd_v2/modules/core.cave",
        );
    });
});
