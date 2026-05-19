export const makeOrbitInput = (
    state: Record<string, any>,
    body: Record<string, any> = {},
) => ({
    bodyId: "body-1",
    owner: {
        id: "egg",
        assignment: { assignedIds: ["body-1"] },
        state: { assignment_duration: { value: 1200 } },
    },
    body: {
        x: 34,
        y: 12,
        radius: 8,
        layer: "default",
        targetId: "egg",
        ...body,
    } as any,
    ownerBody: { x: 10, y: 6, radius: 20 } as any,
    snapshot: { getEntity: () => ({ id: "body-1", state }) } as any,
    timeMs: 2000,
});

export const makeProcessingOrbitArgs = (
    progressRatio: number,
    timeMs: number,
    extra: Record<string, any> = {},
) => ({
    ownerId: "egg",
    ownerKind: "processing" as const,
    ownerX: 10,
    ownerY: 6,
    ownerRadius: 20,
    assignedIds: ["body-1"],
    bodyId: "body-1",
    bodyRadius: 8,
    timeMs,
    progressRatio,
    ...extra,
});

export const angleAt = (point: { x: number; y: number }) =>
    Math.atan2(point.y, point.x);
