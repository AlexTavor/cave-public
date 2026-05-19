// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { JobCard } from "./JobCard";

vi.mock("../../entity-state-link", () => ({
    useEntityBarRef: () => ({ current: null }),
    useEntityTextRef: () => ({ current: null }),
}));
vi.mock("../entityAnalysis/useEntityAnalysis", () => ({
    useEntityAnalysis: () => ({ traits: [] }),
}));

afterEach(cleanup);

const makeEntity = () =>
    ({
        id: "job-1",
        blueprintId: "forge",
        label: "Forge",
        state: {
            cycle: { value: 2, max: 8 },
            food: {
                value: 3,
                max: 6,
                allowDeposit: true,
                allowWithdraw: true,
                priority: 1,
            },
            vals_entropy_food_0: { value: 1.75 },
        },
        powerSink: {
            allocatedDraw: { body: 1 },
            showThrottleSlider: false,
        } as any,
    }) as any;

const makeAssignmentEntity = () =>
    ({
        id: "job-2",
        blueprintId: "forge",
        label: "Forge",
        assignment: { slots: 1, locking: true, assignedIds: [] },
        state: {
            assignment_duration: { value: 5 },
            food: {
                value: 3,
                max: 6,
                allowDeposit: true,
                allowWithdraw: true,
                priority: 1,
            },
            vals_entropy_food_0: { value: 1.75 },
        },
    }) as any;

const makeRuntime = (entity: any) =>
    ({
        getEntity: () => entity,
        commands: { enqueue: vi.fn() },
        getCartridge: () => ({
            blueprints: {
                forge: {
                    components: {
                        display: {
                            description: "Stored fuel.",
                            bars: [
                                {
                                    key: "state.cycle",
                                    maxKey: "state.cycle.max",
                                    label: "Cycle",
                                },
                                {
                                    key: "state.food",
                                    maxKey: "state.food.max",
                                    label: "Food",
                                },
                            ],
                        },
                        behavior: { rules: [] },
                    },
                },
            },
        }),
    }) as any;

const renderCard = (entity: any) =>
    render(
        <ThemeProvider>
            <IconRegistryProvider>
                <JobCard entity={entity} runtime={makeRuntime(entity)} />
            </IconRegistryProvider>
        </ThemeProvider>,
    );

describe("JobCard storage", () => {
    it("shows storage for a flyweight converter node", () => {
        renderCard(makeEntity());
        expect(screen.getByText("Stored fuel.")).toBeTruthy();
        expect(screen.getByText("Food")).toBeTruthy();
    });

    it("does not render cycle as a reservoir row", () => {
        renderCard(makeEntity());
        expect(screen.queryByText("2 / 8")).toBeNull();
    });

    it("shows decay suffix for visible storage with compiled entropy state", () => {
        renderCard(makeEntity());
        expect(screen.getAllByText("1.75/s").length).toBeGreaterThan(0);
    });

    it("shows storage for assignment job cards when the node has visible storage", () => {
        renderCard(makeAssignmentEntity());
        expect(screen.getByText("Stored fuel.")).toBeTruthy();
        expect(screen.getByText("Food")).toBeTruthy();
    });
});
