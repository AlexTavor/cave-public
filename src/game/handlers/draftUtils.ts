import type { RuntimeEntity } from "../../engine/runtime/types";
import type { DraftComponent } from "../../engine/runtime/components/DraftComponent";
import type {
    DraftOptionBlueprint,
    DraftPoolBlueprint,
    DraftPoolEntry,
} from "../../data/schemas/draft";

export const findWorldEntity = (
    entities: RuntimeEntity[],
): RuntimeEntity | null => {
    return entities.find((entity) => entity.id === "sys_world") ?? null;
};

export const getDraftComponent = (
    world: RuntimeEntity,
): DraftComponent | null => {
    const draft = (world as { draft?: DraftComponent }).draft;
    return draft ?? null;
};

export const setDraftComponent = (
    world: RuntimeEntity,
    draft: DraftComponent,
): void => {
    (world as { draft?: DraftComponent }).draft = draft;
};

export const clearDraftComponent = (world: RuntimeEntity): void => {
    const existing = (world as { draft?: DraftComponent }).draft;
    (world as { draft?: DraftComponent }).draft = {
        _tag: "draft",
        active: false,
        poolId: "",
        triggerEntityId: "",
        options: [],
        sourceLabel: "",
        selectedOptionId: null,
        pickedOneOffs: existing?.pickedOneOffs ?? [],
        shownCountsByPool: existing?.shownCountsByPool ?? {},
        cycleNumber: 0,
        currentText: "",
    };
};

export const resolveNextCycleNumber = (
    shownCountsByPool: Record<string, number>,
    poolId: string,
) => (shownCountsByPool[poolId] ?? 0) + 1;

export const incrementShownCount = (
    shownCountsByPool: Record<string, number>,
    poolId: string,
) => ({
    ...shownCountsByPool,
    [poolId]: resolveNextCycleNumber(shownCountsByPool, poolId),
});

export const resolveDraftCurrentText = (
    pool: DraftPoolBlueprint,
    cycleNumber: number,
) => pool.texts?.[cycleNumber - 1] ?? "";

export const clampDraftCount = (count: number, max: number): number =>
    Math.max(1, Math.min(count, max));

export const pickWeightedIndex = (entries: DraftPoolEntry[]): number => {
    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    if (total <= 0) return -1;
    let roll = Math.random() * total;
    for (let i = 0; i < entries.length; i += 1) {
        roll -= entries[i].weight;
        if (roll <= 0) return i;
    }
    return entries.length - 1;
};

export const selectUniqueOptions = (
    pool: DraftPoolBlueprint,
    options: Record<string, DraftOptionBlueprint>,
    count: number,
): DraftOptionBlueprint[] => {
    const remaining = [...pool.entries];
    const picked: DraftOptionBlueprint[] = [];
    while (remaining.length > 0 && picked.length < count) {
        const index = pickWeightedIndex(remaining);
        if (index < 0) break;
        const [entry] = remaining.splice(index, 1);
        const option = options[entry.optionId];
        if (option) picked.push(option);
    }
    return picked;
};

