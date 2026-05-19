type SaveHandler = () => Promise<void>;

const handlers = new Map<string, SaveHandler>();

export const registerProjectSaveHandler = (
    key: string,
    handler: SaveHandler,
) => {
    handlers.set(key, handler);
};

export const unregisterProjectSaveHandler = (key: string) => {
    handlers.delete(key);
};

export const runProjectSaveHandlers = async () => {
    const entries = [...handlers.entries()];
    const results = await Promise.allSettled(
        entries.map(async ([, handler]) => handler()),
    );

    const failed = results.filter((result) => result.status === "rejected");
    return {
        total: entries.length,
        failed: failed.length,
        success: entries.length - failed.length,
    };
};
