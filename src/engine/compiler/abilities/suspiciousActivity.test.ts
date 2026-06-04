import { describe, expect, it } from "vitest";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import { collectSuspiciousPurgeUpdaters } from "./suspiciousActivity";

describe("collectSuspiciousPurgeUpdaters", () => {
    it("keeps only purge-progress add updaters with supported triggers", () => {
        const updaters = collectSuspiciousPurgeUpdaters({
            updater: [
                {
                    target: "sys_world.state.purge_progress.value",
                    op: "ADD",
                    value: 1,
                    triggers: ["cycle_complete"],
                    conditions: [],
                },
                {
                    target: "sys_world.state.purge_progress.value",
                    op: "ADD",
                    value: 2,
                    triggers: ["assignment_complete"],
                    conditions: [],
                },
                {
                    target: "sys_world.state.purge_progress.value",
                    op: "SET",
                    value: 3,
                    triggers: ["cycle_complete"],
                    conditions: [],
                },
                {
                    target: "self.state.heat.value",
                    op: "ADD",
                    value: 1,
                    triggers: ["cycle_complete"],
                    conditions: [],
                },
            ],
        } as EditorAbilities);
        expect(updaters).toHaveLength(2);
        expect(updaters.map((entry) => entry.value)).toEqual([1, 2]);
    });

    it("treats omitted triggers as cycle completion", () => {
        const updaters = collectSuspiciousPurgeUpdaters({
            updater: [
                {
                    target: "sys_world.state.purge_progress.value",
                    op: "ADD",
                    value: 10,
                    conditions: [],
                },
            ],
        } as EditorAbilities);
        expect(updaters).toHaveLength(1);
        expect(updaters[0]?.value).toBe(10);
    });

    it("returns an empty list when authored abilities are missing", () => {
        expect(collectSuspiciousPurgeUpdaters()).toEqual([]);
    });
});
