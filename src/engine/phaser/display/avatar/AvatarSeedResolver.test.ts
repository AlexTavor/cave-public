import { describe, expect, it } from "vitest";
import { resolveAvatarSubjectSeed } from "./AvatarSeedResolver";

describe("AvatarSeedResolver", () => {
    it("resolves assigned avatars through passport avatar keys", () => {
        const runtime = {
            getEntity: (id: string) =>
                id === "body-1"
                    ? {
                          body: {
                              passport: { avatarDisplayKey: "body_avatar:7" },
                          },
                      }
                    : {
                          body: {
                              passport: { avatarDisplayKey: "body_avatar:9" },
                          },
                      },
        } as any;
        const seed = resolveAvatarSubjectSeed(
            {
                id: "carrier-1",
                state: { assignedEntityId: { value: "body-2" } },
            } as any,
            runtime,
        );

        expect(seed).toBe("body_avatar:9");
    });

    it("falls back through assignment order to entity id", () => {
        expect(
            resolveAvatarSubjectSeed({
                id: "carrier-1",
                state: { assignedEntityId: { value: "body-2" } },
            } as any),
        ).toBe("body-2");
        expect(
            resolveAvatarSubjectSeed({
                id: "body-9",
                body: { passport: { identitySerial: 9 } },
            } as any),
        ).toBe("body_avatar:9");
    });
});
