import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ assignBodyHabiti: vi.fn(() => ["human"]) }));

vi.mock("../../../lib/body-identity/bodyIdentityGenerator", () => ({
    generateBodyIdentity: vi.fn(() => ({ name: "Generated" })),
}));
vi.mock("../../../game/habiti/assignBodyHabiti", () => ({
    assignBodyHabiti: mocks.assignBodyHabiti,
}));

import { resolveBodyIdentityBackfill } from "./identityBackfill";

describe("resolveBodyIdentityBackfill", () => {
    it("derives Habiti without passport identity axes and returns presentational patches only", () => {
        const result = resolveBodyIdentityBackfill(
            { passport: { name: "" }, habiti: [] } as any,
            0,
        );
        const firstArg = (mocks.assignBodyHabiti as any).mock.calls[0]?.[0];
        expect(firstArg?.passport).toBeUndefined();
        expect(result.habitus).toEqual(["human"]);
        expect(result.passportPatch).toEqual(
            expect.objectContaining({
                identitySerial: 1,
                avatarDisplayKey: "body_avatar:1",
                name: "Generated",
            }),
        );
    });
});
