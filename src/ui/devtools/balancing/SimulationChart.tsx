import React, { useMemo, useState } from "react";
import type { SimulationResult } from "../../../engine/balancing/HeadlessRunner";
import {
    ChartEmpty,
    ChartLegend,
    ChartSurface,
    ChartSvg,
} from "./SimulationChart.styles";
import { prepareChart } from "./SimulationChart.utils";

interface SimulationChartProps {
    result: SimulationResult | null;
}

export const SimulationChart: React.FC<SimulationChartProps> = ({ result }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const chart = useMemo(() => prepareChart(result?.history ?? []), [result]);

    if (!chart) {
        return (
            <ChartSurface>
                <ChartEmpty>Run a simulation to view the trend.</ChartEmpty>
            </ChartSurface>
        );
    }

    const activeIndex = hoverIndex ?? chart.history.length - 1;
    const activeStep = chart.history[activeIndex];

    return (
        <ChartSurface>
            <ChartLegend>
                <div>Tick: {activeStep.tick}</div>
                <div>Pop: {activeStep.population}</div>
                <div>Food: {activeStep.food.toFixed(0)}</div>
                <div>Heat: {activeStep.heat.toFixed(0)}</div>
                <div
                    style={{
                        marginLeft: "auto",
                        color:
                            chart.extinctionX === null ? "#66bb6a" : "#f44336",
                        fontWeight: "bold",
                    }}
                >
                    {chart.extinctionX === null ? "Survived: " : "Extinction: "}
                    {chart.survivalSeconds.toFixed(1)}s
                </div>
            </ChartLegend>
            <ChartSvg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                onMouseLeave={() => setHoverIndex(null)}
                onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const ratio = Math.min(
                        1,
                        Math.max(0, (event.clientX - rect.left) / rect.width),
                    );
                    const firstTick = chart.history.at(0)?.tick ?? 0;
                    const lastTick = chart.history.at(-1)?.tick ?? firstTick;
                    const targetTick =
                        firstTick + ratio * (lastTick - firstTick);

                    const closest = chart.history.reduce(
                        (best, step, index) => {
                            const delta = Math.abs(step.tick - targetTick);
                            if (delta < best.delta) {
                                return { index, delta };
                            }
                            return best;
                        },
                        { index: 0, delta: Number.POSITIVE_INFINITY },
                    );

                    setHoverIndex(closest.index);
                }}
            >
                {/* Extinction Marker Line */}
                {chart.extinctionX !== null && (
                    <line
                        x1={chart.extinctionX}
                        y1={0}
                        x2={chart.extinctionX}
                        y2={100}
                        stroke="#f44336"
                        strokeWidth={3}
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="4 2"
                        opacity={0.8}
                    />
                )}

                {/* Data Series Lines */}
                {chart.series.map((line) => (
                    <polyline
                        key={line.id}
                        data-testid={`${line.id}-line`}
                        fill="none"
                        stroke={line.color}
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        points={line.points
                            .map((point) => `${point.x},${point.y}`)
                            .join(" ")}
                    />
                ))}

                {/* Hover Indicator */}
                {hoverIndex !== null && chart.series[0]?.points[hoverIndex] ? (
                    <line
                        x1={chart.series[0].points[hoverIndex].x}
                        y1={0}
                        x2={chart.series[0].points[hoverIndex].x}
                        y2={100}
                        stroke="#ffffff"
                        strokeOpacity={0.35}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                    />
                ) : null}
            </ChartSvg>
        </ChartSurface>
    );
};
