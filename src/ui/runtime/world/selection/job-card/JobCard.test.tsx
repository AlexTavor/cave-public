// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { EntityStateLinkProvider } from "../../entity-state-link";
import { TestWorldInteractionProvider } from "../../testUtils";
import { JobCard } from "./JobCard";

vi.mock("../entityAnalysis/useEntityAnalysis", () => ({
    useEntityAnalysis: () => ({ traits: [] }),
}));

const renderCard = (entity: any, runtime: any) =>
    render(
        <ThemeProvider>
            <IconRegistryProvider>
                <TestWorldInteractionProvider value={{ runtime }}>
                    <EntityStateLinkProvider>
                        <JobCard entity={entity} runtime={runtime} />
                    </EntityStateLinkProvider>
                </TestWorldInteractionProvider>
            </IconRegistryProvider>
        </ThemeProvider>,
    );

describe("JobCard", () => {
    it("renders flyweight-backed cycle analysis and next-cycle headers", () => {
        const entity = {
            id: "job-1",
            blueprintId: "forge",
            label: "Forge",
            state: {
                cycle: { value: 5, max: 9 },
                vals_prod_wood_amt_0: { value: 3 },
                vals_conv_in_wood_0_0: { value: 2 },
                vals_conv_out_heat_0_0: { value: 5 },
            },
            powerSink: {
                baseDemand: { body: 10, mind: 0, social: 0 },
                allocatedDraw: { body: 2, mind: 0, social: 0 },
                throttle: 1,
                efficiency: 0.5,
                drawFraction: {},
                status: "nominal",
            } as any,
        };
        const runtime = {
            getEntity: () => entity,
            getCartridge: () => ({
                blueprints: {
                    forge: {
                        _editor: {
                            abilities: { conversion: [{ id: "Smelter" }] },
                        },
                        components: {
                            display: {
                                label: "Forge",
                                description: "Turns wood into heat.",
                                bars: [
                                    {
                                        key: "state.cycle",
                                        maxKey: "state.cycle.max",
                                    },
                                ],
                            },
                            behavior: {
                                rules: [
                                    {
                                        id: "sys_produce_wood_0",
                                        sortKey: "a",
                                        conditions: [],
                                        actions: [
                                            {
                                                type: "MUTATE",
                                                target: "self.state.wood.value",
                                                op: "ADD",
                                                value: "self.state.vals_prod_wood_amt_0.value",
                                            },
                                        ],
                                    },
                                    {
                                        id: "sys_convert_default_0",
                                        sortKey: "b",
                                        conditions: [],
                                        actions: [
                                            {
                                                type: "MUTATE",
                                                target: "self.state.wood.value",
                                                op: "SUB",
                                                value: "self.state.vals_conv_in_wood_0_0.value",
                                            },
                                            {
                                                type: "MUTATE",
                                                target: "self.state.heat.value",
                                                op: "ADD",
                                                value: "self.state.vals_conv_out_heat_0_0.value",
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
        } as any;
        renderCard(entity, runtime);
        expect(screen.getByText("Forge")).toBeTruthy();
        expect(screen.getByText("Turns wood into heat.")).toBeTruthy();
        expect(screen.getByText("2 s")).toBeTruthy();
        expect(screen.getByText("Production")).toBeTruthy();
        expect(screen.getByText("Smelter")).toBeTruthy();
        expect(screen.queryByRole("slider", { name: "Throttle" })).toBeNull();
    });
});

