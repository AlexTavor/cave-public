import snapshot from "../../../public/bootstrap/vfs-prod.json";
import { describe, expect, it } from "vitest";

const files = snapshot as unknown as Record<string, any>;

describe("bootstrap absorption snapshot", () => {
    it("keeps transfer-habiti in the public bootstrap assignment results", () => {
        expect(
            files["example/modules/absorption.bp"]?._editor?.abilities
                ?.assignment?.results,
        ).toContainEqual({ type: "transfer_habiti" });
    });
});
