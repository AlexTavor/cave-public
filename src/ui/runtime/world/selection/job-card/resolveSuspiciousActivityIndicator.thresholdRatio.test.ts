import { describe, expect, it } from "vitest";
import { resolveSuspiciousActivityIndicator } from "./resolveSuspiciousActivityIndicator";

const runtime = {
    getCartridge: () => ({
        config: {
            settings: {
                game_config: {
                    susDisplays: [
                        { text: "Risky", color: "#ff0000", threshold: 8 },
                    ],
                },
            },
        },
        blueprints: {
            forge: {
                tags: ["suspicious_activity"],
                _editor: {
                    abilities: {
                        updater: [
                            {
                                target: "sys_world.state.purge_progress.value",
                                op: "ADD",
                                value: 10,
                                triggers: ["cycle_complete"],
                                conditions: [],
                            },
                        ],
                    },
                },
            },
        },
    }),
} as any;

describe("resolveSuspiciousActivityIndicator absolute thresholds", () => {
    it("matches against the absolute purge amount", () => {
        const model = resolveSuspiciousActivityIndicator(
            {
                blueprintId: "forge",
                tags: ["suspicious_activity"],
                state: {},
            } as any,
            runtime,
        );
        expect(model).toMatchObject({ text: "Risky", color: "#ff0000" });
    });
});
