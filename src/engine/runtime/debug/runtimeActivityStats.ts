import {
    getPhaserDebugEnabled,
    registerPhaserDebugResetter,
} from "../../phaser/debug/phaserDebugToggle";

export interface RuntimeActivityStats {
    dirtyMarks: number;
    entitySorts: number;
    appliedCommands: number;
    emittedCommands: number;
    appliedByType: Record<string, number>;
    emittedByType: Record<string, number>;
    emittedBySystem: Record<string, number>;
}

const stats: RuntimeActivityStats = {
    dirtyMarks: 0,
    entitySorts: 0,
    appliedCommands: 0,
    emittedCommands: 0,
    appliedByType: {},
    emittedByType: {},
    emittedBySystem: {},
};

const bump = (
    bucket: Record<string, number>,
    key: string,
    count: number,
): void => {
    bucket[key] = (bucket[key] ?? 0) + count;
};

const resetRuntimeActivityStats = (): void => {
    stats.dirtyMarks = 0;
    stats.entitySorts = 0;
    stats.appliedCommands = 0;
    stats.emittedCommands = 0;
    stats.appliedByType = {};
    stats.emittedByType = {};
    stats.emittedBySystem = {};
};

registerPhaserDebugResetter(resetRuntimeActivityStats);

export const recordDirtyMark = (): void => {
    if (!getPhaserDebugEnabled()) return;
    stats.dirtyMarks += 1;
};

export const recordEntitySort = (): void => {
    if (!getPhaserDebugEnabled()) return;
    stats.entitySorts += 1;
};

export const recordAppliedCommands = (count: number): void => {
    if (!getPhaserDebugEnabled()) return;
    stats.appliedCommands += count;
};

export const recordAppliedCommandType = (type: string): void => {
    if (!getPhaserDebugEnabled()) return;
    bump(stats.appliedByType, type, 1);
};

export const recordEmittedCommands = (count: number): void => {
    if (!getPhaserDebugEnabled()) return;
    stats.emittedCommands += count;
};

export const recordEmittedBatch = (
    systemName: string,
    types: ReadonlyArray<string>,
): void => {
    if (!getPhaserDebugEnabled()) return;
    bump(stats.emittedBySystem, systemName, types.length);
    for (const type of types) bump(stats.emittedByType, type, 1);
};

export const readRuntimeActivityStats = (): RuntimeActivityStats => ({
    ...stats,
    appliedByType: { ...stats.appliedByType },
    emittedByType: { ...stats.emittedByType },
    emittedBySystem: { ...stats.emittedBySystem },
});
