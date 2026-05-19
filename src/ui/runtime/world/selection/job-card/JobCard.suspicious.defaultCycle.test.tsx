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

const entity = {
    id: "job-2",
    blueprintId: "luretraveler",
    state: { cycle: { value: 1, max: 2 } },
    powerSink: {
        baseDemand: { body: 1, mind: 0, social: 0 },
        maxDemand: { body: 1, mind: 0, social: 0 },
        allocatedDraw: { body: 1, mind: 0, social: 0 },
        throttle: 1,
        efficiency: 1,
        drawFraction: {},
        status: "nominal",
    },
} as any;

const runtime: any = {
    getEntity: () => ({ id: "sys_world", run: {} }),
    getCartridge: () => ({
        config: {
            settings: {
                game_config: {
                    susDisplays: [
                        { text: "Risky", color: "#ff0000", threshold: 10 },
                    ],
                },
            },
        },
        blueprints: {
            luretraveler: {
                tags: [],
                components: {
                    display: {
                        label: "Lure Traveler",
                        description: "desc",
                        bars: [
                            { key: "state.cycle", maxKey: "state.cycle.max" },
                        ],
                    },
                    behavior: {
                        rules: [
                            {
                                conditions: [{ id: "cycle_complete" }],
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
    commands: { enqueue: vi.fn() },
};

describe("JobCard suspicious activity default cycle", () => {
    it("renders the suspicious pill when the authored updater relies on the default cycle trigger", () => {
        render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <JobCard entity={entity} runtime={runtime} />
                </IconRegistryProvider>
            </ThemeProvider>,
        );
        expect(screen.getAllByText("Risky").length).toBeGreaterThan(0);
    });
});
