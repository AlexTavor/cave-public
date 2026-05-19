const TAU = Math.PI * 2;

const wrapPhase = (value: number) => {
    const wrapped = value % TAU;
    return wrapped < 0 ? wrapped + TAU : wrapped;
};

export const advanceEyeDrift = (
    phaseX: number,
    phaseY: number,
    stepX: number,
    stepY: number,
    travel: number,
): {
    nextPhaseX: number;
    nextPhaseY: number;
    driftX: number;
    driftY: number;
} => {
    const nextPhaseX = wrapPhase(phaseX + stepX);
    const nextPhaseY = wrapPhase(phaseY + stepY);
    return {
        nextPhaseX,
        nextPhaseY,
        driftX: Math.sin(nextPhaseX) * travel,
        driftY: Math.cos(nextPhaseY) * travel,
    };
};
