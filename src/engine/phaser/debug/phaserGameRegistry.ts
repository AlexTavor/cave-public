const ids = new Set<string>();
let nextId = 1;

export const registerPhaserGame = (): string => {
    const id = `game-${nextId++}`;
    ids.add(id);
    return id;
};

export const unregisterPhaserGame = (id: string): void => {
    ids.delete(id);
};

export const getActivePhaserGameCount = (): number => ids.size;
