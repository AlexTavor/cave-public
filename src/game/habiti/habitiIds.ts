export const normalizeHabitiIds = (ids: string[]) =>
    [...new Set(ids.filter(Boolean))].sort((left, right) =>
        left.localeCompare(right),
    );
