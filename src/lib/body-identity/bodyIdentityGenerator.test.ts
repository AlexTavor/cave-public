import { describe, expect, it } from "vitest";
import { bodyIdentityCatalog } from "./bodyIdentityCatalog";
import { generateBodyIdentity } from "./bodyIdentityGenerator";

describe("generateBodyIdentity", () => {
    const habitusIndex = {
        human: { id: "human", type: "species" },
        woman: { id: "woman", type: "gender" },
        scarred: { id: "scarred", type: "unique_body" },
    } as any;

    it("is deterministic for the same serial and assigned Habiti", () => {
        const first = generateBodyIdentity(
            7,
            "Unknown",
            ["human", "woman"],
            habitusIndex,
            bodyIdentityCatalog,
        );
        const second = generateBodyIdentity(
            7,
            "Unknown",
            ["human", "woman"],
            habitusIndex,
            bodyIdentityCatalog,
        );
        expect(first).toEqual(second);
    });

    it("changes the candidate sequence when identity Habiti change", () => {
        const first = generateBodyIdentity(
            7,
            "Unknown",
            ["human", "woman"],
            habitusIndex,
            bodyIdentityCatalog,
        );
        const second = generateBodyIdentity(
            7,
            "Unknown",
            ["human", "scarred"],
            habitusIndex,
            bodyIdentityCatalog,
        );
        expect(first?.name).not.toBe(second?.name);
    });

    it("returns only name output and preserves authored names", () => {
        expect(
            generateBodyIdentity(
                3,
                "Ada Stone",
                ["human"],
                habitusIndex,
                bodyIdentityCatalog,
            ),
        ).toBeNull();
        expect(
            generateBodyIdentity(
                5,
                "   ",
                ["human"],
                habitusIndex,
                bodyIdentityCatalog,
            ),
        ).toEqual({ name: expect.any(String) });
    });

    it("skips names that are already reserved", () => {
        const first = generateBodyIdentity(
            1,
            "Unknown",
            ["human"],
            habitusIndex,
            bodyIdentityCatalog,
        );
        const second = generateBodyIdentity(
            1,
            "Unknown",
            ["human"],
            habitusIndex,
            bodyIdentityCatalog,
            [first?.name ?? ""],
        );
        expect(second?.name).not.toBe(first?.name);
    });
});
