type Pt = { x: number; y: number };

const runChaikinPass = (points: Pt[]): Pt[] => {
    const result = [points[0]];
    for (let index = 1; index < points.length - 1; index++) {
        const prev = points[index - 1];
        const point = points[index];
        const next = points[index + 1];
        result.push(
            {
                x: prev.x * 0.25 + point.x * 0.75,
                y: prev.y * 0.25 + point.y * 0.75,
            },
            {
                x: point.x * 0.75 + next.x * 0.25,
                y: point.y * 0.75 + next.y * 0.25,
            },
        );
    }
    result.push(points.at(-1) ?? points[0]);
    return result;
};

export const buildSmoothGuidePath = (points: Pt[]): Pt[] => {
    if (points.length < 3) return points;
    return runChaikinPass(runChaikinPass(points));
};
