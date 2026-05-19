export function generateEntityId(now: () => number = Date.now): string {
    // Timestamp based for uniqueness (keeps existing convention).
    const timestamp = now().toString(36);
    return `entity_${timestamp}`;
}

const makeDraftId = (
    prefix: string,
    now: () => number = Date.now,
    rand: () => number = Math.random,
): string => {
    const timestamp = now().toString(36);
    const salt = Math.floor(rand() * 1e6).toString(36);
    return `${prefix}_${timestamp}_${salt}`;
};

export function generateDraftOptionId(): string {
    return makeDraftId("opt");
}

export function generateDraftPoolId(): string {
    return makeDraftId("pool");
}
