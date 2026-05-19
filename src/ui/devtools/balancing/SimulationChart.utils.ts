import type { SimulationResult } from "../../../engine/balancing/HeadlessRunner";

export type ChartPoint = { x: number; y: number; tick: number };

export type ChartSeries = {
    points: ChartPoint[];
    color: string;
    id: string;
    label: string;
};

const buildSeries = (
    history: SimulationResult["history"],
    key: "population" | "food" | "heat",
    color: string,
    label: string,
): ChartSeries => ({
    points: history.map((step) => ({
        tick: step.tick,
        x: step.tick,
        y: step[key],
    })),
    color,
    id: key,
    label,
});

export const prepareChart = (history: SimulationResult["history"]) => {
    if (history.length === 0) return null;

    const series = [
        buildSeries(history, "food", "#68f28e", "Food"),
        buildSeries(history, "heat", "#f6a04d", "Heat"),
        buildSeries(history, "population", "#5fb6ff", "Population"),
    ];

    const ticks = history.map((step) => step.tick);
    const values = series.flatMap((line) => line.points.map((p) => p.y));
    const minX = Math.min(...ticks);
    const maxX = Math.max(...ticks);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const xRange = maxX - minX || 1;
    const yRange = maxY - minY || 1;

    const normalizeX = (tick: number) => ((tick - minX) / xRange) * 100;
    const normalizeY = (val: number) => 100 - ((val - minY) / yRange) * 100;

    const normalize = (point: ChartPoint) => ({
        tick: point.tick,
        x: normalizeX(point.x),
        y: normalizeY(point.y),
    });

    // Detect Extinction Event
    // We ignore the initial state where population might be 0 due to spawn lag
    const firstAliveIndex = history.findIndex((step) => step.population > 0);

    let extinctionStep;

    if (firstAliveIndex === -1) {
        // Never had population > 0. If it ends with 0, consider it immediate extinction/failure.
        const last = history.at(-1);
        if (last && last.population <= 0) {
            extinctionStep = last;
        }
    } else {
        // Look for extinction occuring AFTER the population was established
        extinctionStep = history
            .slice(firstAliveIndex)
            .find((step) => step.population <= 0);
    }

    const extinctionX = extinctionStep ? normalizeX(extinctionStep.tick) : null;

    // Calculate survival time (assuming 16ms tick rate from HeadlessRunner)
    // If extinct, use extinction tick. Otherwise use total duration.
    const endTick = extinctionStep
        ? extinctionStep.tick
        : (history.at(-1)?.tick ?? 0);
    const survivalSeconds = (endTick * 16) / 1000;

    return {
        history,
        series: series.map((line) => ({
            ...line,
            points: line.points.map(normalize),
        })),
        extinctionX,
        survivalSeconds,
    };
};
