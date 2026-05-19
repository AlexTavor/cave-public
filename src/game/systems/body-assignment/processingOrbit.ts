export const resolveProcessingOrbitRadius = (input: {
    ownerRadius: number;
    bodyRadius: number;
    progressRatio?: number;
}) => {
    const progress = Math.max(0, Math.min(1, input.progressRatio ?? 0));
    const overlapInset = 0.25 * Math.min(input.ownerRadius, input.bodyRadius);
    const outer = input.ownerRadius + 6 * input.bodyRadius;
    const inner = input.ownerRadius + input.bodyRadius - overlapInset;
    return outer + (inner - outer) * progress;
};

export const resolveProcessingOrbitSpeed = (progressRatio = 0): number => {
    const progress = Math.max(0, Math.min(1, progressRatio));
    return 0.0015 + (0.006 - 0.0015) * progress;
};
