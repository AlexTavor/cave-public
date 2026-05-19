// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { JobCard } from "./JobCard";
import { CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY } from "../../../../../engine/runtime/conditionalActivationState";

vi.mock("../../entity-state-link", () => ({
    useEntityBarRef: () => ({ current: null }),
    useEntityTextRef: () => ({ current: null }),
}));

afterEach(cleanup);

const runtime = {
    getEntity: (id: string) => ({ id }),
    getCartridge: () => ({ blueprints: { lumber_yard: { components: {} } } }),
    commands: { enqueue: vi.fn() },
} as any;

const renderCard = (showThrottleSlider?: boolean) =>
    render(
        <ThemeProvider>
            <IconRegistryProvider>
                <JobCard
                    runtime={runtime}
                    entity={
                        {
                            id: "job-1",
                            blueprintId: "lumber_yard",
                            display: { label: "Lumber Yard", icon: "unknown" },
                            powerSink: {
                                baseDemand: { body: 10, mind: 0, social: 0 },
                                throttle: 1,
                                efficiency: 1,
                                drawFraction: {},
                                status: "nominal",
                                showThrottleSlider,
                            },
                        } as RuntimeEntity
                    }
                />
            </IconRegistryProvider>
        </ThemeProvider>,
    );

const renderHiddenCard = () =>
    render(
        <ThemeProvider>
            <IconRegistryProvider>
                <JobCard
                    runtime={runtime}
                    entity={
                        {
                            id: "job-2",
                            blueprintId: "lumber_yard",
                            display: { label: "Lumber Yard", icon: "unknown" },
                            powerSink: {
                                baseDemand: { body: 10, mind: 0, social: 0 },
                                throttle: 1,
                                efficiency: 1,
                                drawFraction: {},
                                status: "nominal",
                                showThrottleSlider: true,
                            },
                            state: {
                                [CONDITIONAL_ACTIVATION_HIDE_THROTTLE_STATE_KEY]:
                                    { value: 1 },
                            },
                        } as RuntimeEntity
                    }
                />
            </IconRegistryProvider>
        </ThemeProvider>,
    );

describe("JobCard throttle visibility", () => {
    it("renders power requirements when the sink disables the slider", () => {
        renderCard(false);
        expect(screen.queryByRole("slider")).toBeNull();
        expect(screen.getByTestId("power-body")).toBeDefined();
    });

    it("renders power requirements without the slider when the sink allows it", () => {
        renderCard(true);
        expect(screen.queryByRole("slider")).toBeNull();
        expect(screen.getByTestId("power-body")).toBeDefined();
    });

    it("renders power requirements when conditional activation suppresses it", () => {
        renderHiddenCard();
        expect(screen.queryByRole("slider")).toBeNull();
        expect(screen.getByTestId("power-body")).toBeDefined();
    });
});
