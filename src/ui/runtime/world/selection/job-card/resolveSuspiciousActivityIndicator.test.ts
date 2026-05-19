import { describe, expect, it } from "vitest";
import { resolveSuspiciousActivityIndicator } from "./resolveSuspiciousActivityIndicator";

const runtime = (susDisplays: any[]) =>
    ({
        getCartridge: () => ({
            config: { settings: { game_config: { susDisplays } } },
            blueprints: {
                forge: {
                    tags: ["suspicious_activity"],
                    _editor: {
                        abilities: {
                            updater: [
                                {
                                    target: "sys_world.state.purge_progress.value",
                                    op: "ADD",
                                    value: 2,
                                    triggers: ["cycle_complete"],
                                    conditions: [],
                                },
                                {
                                    target: "sys_world.state.purge_progress.value",
                                    op: "ADD",
                                    value: "self.state.purge_bonus.value",
                                    triggers: ["assignment_complete"],
                                    conditions: [],
                                },
                            ],
                        },
                    },
                },
            },
        }),
    }) as any;

describe("resolveSuspiciousActivityIndicator", () => {
    it("resolves the highest matching display and combined tooltip details", () => {
        const model = resolveSuspiciousActivityIndicator(
            {
                blueprintId: "forge",
                tags: ["suspicious_activity"],
                state: { purge_bonus: { value: 3 } },
            } as any,
            runtime([
                { text: "Low", color: "#111111", threshold: 1 },
                { text: "High", color: "#222222", threshold: 5 },
            ]),
        );
        expect(model).toMatchObject({ text: "High", color: "#222222" });
        expect(model?.tooltipLines).toContain(
            "Triggers: cycle completion and assignment completion",
        );
        expect(model?.tooltipLines).toContain("Purge Progress: +5");
    });

    it("returns null when no authored display threshold matches", () => {
        const model = resolveSuspiciousActivityIndicator(
            {
                blueprintId: "forge",
                tags: ["suspicious_activity"],
                state: {},
            } as any,
            runtime([{ text: "High", color: "#222222", threshold: 10 }]),
        );
        expect(model).toBeNull();
    });
});
