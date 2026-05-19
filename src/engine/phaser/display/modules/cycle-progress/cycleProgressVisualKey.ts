import { stringHash } from "../../../../../utils/deterministicHash";

export const toCycleProgressColor = (hex: string) =>
    Number.parseInt(hex.slice(1), 16);

export const buildCycleProgressKey = (prefix: string, payload: unknown) =>
    `${prefix}:${Math.round(stringHash(JSON.stringify(payload)) * 1_000_000_000)}`;
