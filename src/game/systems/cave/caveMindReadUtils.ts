import type { RuntimeEntity } from "../../../engine/runtime/types";

export const readStateNumber = (entity: RuntimeEntity, key: string): number => {
    const entry = (entity.state as Record<string, any> | undefined)?.[key];
    const value = entry?.value ?? entry;
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

export const readStateString = (entity: RuntimeEntity, key: string): string => {
    const value = (entity.state as Record<string, any> | undefined)?.[key]
        ?.value;
    return typeof value === "string" ? value : "";
};

export const readStateBool = (entity: RuntimeEntity, key: string): boolean => {
    const value = (entity.state as Record<string, any> | undefined)?.[key]
        ?.value;
    return typeof value === "boolean" ? value : value === 1;
};

export const hasTag = (entity: RuntimeEntity, tag: string): boolean =>
    Array.isArray(entity.tags) && entity.tags.includes(tag);

const readArray = (value: unknown): unknown[] =>
    Array.isArray(value) ? value : [];

const traitToId = (trait: unknown): string[] => {
    if (typeof trait === "string") return [trait];
    if (trait && typeof trait === "object" && "id" in trait) {
        const id = (trait as { id?: unknown }).id;
        return typeof id === "string" ? [id] : [];
    }
    return [];
};

export const readTraitIds = (entity: RuntimeEntity): string[] => {
    const bodyTraits = readArray((entity as any).body?.traits).flatMap(
        traitToId,
    );
    const liveTraits = readArray((entity as any).traits).flatMap(traitToId);
    return Array.from(new Set([...bodyTraits, ...liveTraits])).sort(
        (left, right) => left.localeCompare(right),
    );
};
