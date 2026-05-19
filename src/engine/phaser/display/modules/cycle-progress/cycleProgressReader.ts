export type CycleProgressRead =
    | { kind: "absent" }
    | { kind: "invalid" }
    | { kind: "valid"; value: number; max: number };

export const readCycleProgress = (
    entity: Record<string, unknown>,
): CycleProgressRead => {
    const state = entity.state as Record<string, unknown> | undefined;
    if (!state || !("cycle" in state)) return { kind: "absent" };
    const cycle = state.cycle as { value?: unknown; max?: unknown } | undefined;
    if (
        !cycle ||
        typeof cycle !== "object" ||
        !Number.isFinite(cycle.value) ||
        !Number.isFinite(cycle.max) ||
        Number(cycle.max) <= 0
    ) {
        return { kind: "invalid" };
    }
    return {
        kind: "valid",
        value: Number(cycle.value),
        max: Number(cycle.max),
    };
};
