export const resolveId = (localId: string, namespace: string): string => {
    if (localId.includes("::")) return localId;
    return `${namespace}::${localId}`;
};
