import { resolveDominantCaveEmotion } from "../../../game/systems/cave/resolveDominantCaveEmotion";

export type CaveStatusKeyword =
    | "hungry"
    | "cold"
    | "happy"
    | "sad"
    | "curious"
    | "scared"
    | "worried";

export const resolveCaveEntity = (runtime: {
    getEntity: (id: string) => any;
    getWorld: () => any;
}) => {
    const direct = runtime.getEntity("sys_world");
    if (direct?.cave) return direct;
    return (
        runtime.getWorld()?.entities?.find((entity: any) => entity?.cave) ??
        null
    );
};

const resolveStateNumber = (
    state: Record<string, any> | undefined,
    key: string,
) => {
    const value = state?.[key]?.value ?? state?.[key];
    return typeof value === "number" ? value : 0;
};

export const resolveCaveStatusParts = (entity: any): CaveStatusKeyword[] => {
    const parts: CaveStatusKeyword[] = [];
    const state = entity?.state as Record<string, any> | undefined;
    if (resolveStateNumber(state, "food") <= 0) parts.push("hungry");
    if (resolveStateNumber(state, "heat") <= 0) parts.push("cold");
    const emotions = entity?.cave?.mind?.emotions;
    if (!emotions) return parts;
    parts.push(resolveDominantCaveEmotion(emotions));
    return parts;
};

const joinStatusParts = (parts: string[]) => {
    if (parts.length <= 1) return parts[0] ?? "";
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
};

export const formatCaveStatusSentence = (parts: string[]) =>
    `Cave is ${joinStatusParts(parts)}`;

