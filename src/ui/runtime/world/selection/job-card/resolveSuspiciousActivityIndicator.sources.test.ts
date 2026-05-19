import { describe, expect, it } from "vitest";
import { resolveSuspiciousActivityIndicator } from "./resolveSuspiciousActivityIndicator";

const susDisplays = [{ text: "Risky", color: "#ff0000", threshold: 10 }];

describe("resolveSuspiciousActivityIndicator sources", () => {
    it("supports omitted tags and numeric-string updater amounts", () => {
        const model = resolveSuspiciousActivityIndicator(
            { blueprintId: "forge", state: {} } as any,
            {
                getCartridge: () => ({
                    config: { game_config: { susDisplays } },
                    blueprints: {
                        forge: {
                            tags: [],
                            _editor: {
                                abilities: {
                                    updater: [
                                        {
                                            target: "sys_world.state.purge_progress.value",
                                            op: "ADD",
                                            value: "10",
                                            conditions: [],
                                        },
                                    ],
                                },
                            },
                        },
                    },
                }),
            } as any,
        );
        expect(model).toMatchObject({ text: "Risky", color: "#ff0000" });
        expect(model?.tooltipLines).toContain("Purge Progress: +10");
    });

    it("falls back to compiled behavior when editor abilities are unavailable", () => {
        const model = resolveSuspiciousActivityIndicator(
            { blueprintId: "forge", state: {} } as any,
            {
                getCartridge: () => ({
                    config: { settings: { game_config: { susDisplays } } },
                    blueprints: {
                        forge: {
                            components: {
                                behavior: {
                                    rules: [
                                        {
                                            conditions: [
                                                { id: "cycle_complete" },
                                            ],
                                            actions: [
                                                {
                                                    type: "MUTATE",
                                                    target: "sys_world.state.purge_progress.value",
                                                    op: "ADD",
                                                    value: "10",
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    },
                }),
            } as any,
        );
        expect(model).toMatchObject({ text: "Risky", color: "#ff0000" });
    });
});
