type EntryWithVisible = { visible?: boolean };

export const readExplicitVisible = (value: unknown): boolean | undefined => {
    const visible = (value as { visible?: unknown } | undefined)?.visible;
    return typeof visible === "boolean" ? visible : undefined;
};

export const resolveEntryVisible = (
    entry: EntryWithVisible | undefined,
    explicitVisible: boolean | undefined,
): boolean => explicitVisible ?? entry?.visible ?? false;
