import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { suspiciousActivityCompiler } from "./suspiciousActivityCompiler";

describe("suspiciousActivityCompiler", () => {
    it("adds the suspicious tag for qualifying purge updaters", () => {
        const draft = createBlueprint("bp");
        suspiciousActivityCompiler(draft, {
            updater: [
                {
                    target: "sys_world.state.purge_progress.value",
                    op: "ADD",
                    value: 1,
                    triggers: ["cycle_complete"],
                    conditions: [],
                },
            ],
        } as any);
        expect(draft.tags).toContain("suspicious_activity");
    });

    it("does not duplicate the suspicious tag or add it for non-qualifying updaters", () => {
        const draft = createBlueprint("bp", { tags: ["suspicious_activity"] });
        suspiciousActivityCompiler(draft, {
            updater: [
                {
                    target: "sys_world.state.purge_progress.value",
                    op: "SUB",
                    value: 1,
                    triggers: ["cycle_complete"],
                    conditions: [],
                },
            ],
        } as any);
        expect(draft.tags).toEqual(["suspicious_activity"]);
    });
});
