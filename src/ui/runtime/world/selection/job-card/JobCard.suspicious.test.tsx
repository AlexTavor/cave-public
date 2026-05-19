// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { JobCard } from "./JobCard";

vi.mock("../../entity-state-link", () => ({
    useEntityBarRef: () => ({ current: null }),
    useEntityTextRef: () => ({ current: null }),
}));
vi.mock("../entityAnalysis/useEntityAnalysis", () => ({
    useEntityAnalysis: () => ({ traits: [] }),
}));

describe("JobCard suspicious activity", () => {
    it("renders the suspicious pill for qualifying job cards", () => {
        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <JobCard
                        entity={
                            {
                                id: "job-1",
                                blueprintId: "forge",
                                tags: ["suspicious_activity"],
                                state: { cycle: { value: 1, max: 2 } },
                                powerSink: {
                                    baseDemand: { body: 1, mind: 0, social: 0 },
                                    maxDemand: { body: 1, mind: 0, social: 0 },
                                    allocatedDraw: {
                                        body: 1,
                                        mind: 0,
                                        social: 0,
                                    },
                                    throttle: 1,
                                    efficiency: 1,
                                    drawFraction: {},
                                    status: "nominal",
                                },
                            } as any
                        }
                        runtime={
                            {
                                getEntity: () => ({ id: "sys_world", run: {} }),
                                getCartridge: () => ({
                                    config: {
                                        settings: {
                                            game_config: {
                                                susDisplays: [
                                                    {
                                                        text: "Risky",
                                                        color: "#ff0000",
                                                        threshold: 1,
                                                    },
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
                                                            value: 1,
                                                            triggers: [
                                                                "cycle_complete",
                                                            ],
                                                            conditions: [],
                                                        },
                                                    ],
                                                },
                                            },
                                            components: {
                                                display: {
                                                    label: "Forge",
                                                    description: "desc",
                                                    bars: [
                                                        {
                                                            key: "state.cycle",
                                                            maxKey: "state.cycle.max",
                                                        },
                                                    ],
                                                },
                                                behavior: { rules: [] },
                                            },
                                        },
                                    },
                                }),
                                commands: { enqueue: vi.fn() },
                            } as any
                        }
                    />
                </IconRegistryProvider>
            </ThemeProvider>,
        );
        expect(screen.getByText("Risky")).toBeTruthy();
    });
});
