export const readDisplaySceneRuntime = <TRuntime>(
    scene: object,
): TRuntime | null => {
    const candidate = scene as { readRuntime?: () => unknown };
    return typeof candidate.readRuntime === "function"
        ? (candidate.readRuntime() as TRuntime | null)
        : null;
};
