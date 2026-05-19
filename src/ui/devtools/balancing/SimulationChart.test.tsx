// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { SimulationChart } from "./SimulationChart";

const renderChart = () =>
    render(
        <ThemeProvider>
            <SimulationChart
                result={{
                    status: "completed",
                    durationMs: 10,
                    history: [
                        {
                            tick: 0,
                            population: 10,
                            food: 5,
                            heat: 2,
                            comfort: 1,
                        },
                        {
                            tick: 60,
                            population: 12,
                            food: 4,
                            heat: 3,
                            comfort: 1,
                        },
                    ],
                }}
            />
        </ThemeProvider>,
    );

describe("SimulationChart", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders polylines for each metric", () => {
        renderChart();

        expect(screen.getByTestId("population-line")).toBeTruthy();
        expect(screen.getByTestId("food-line")).toBeTruthy();
        expect(screen.getByTestId("heat-line")).toBeTruthy();
    });
});

