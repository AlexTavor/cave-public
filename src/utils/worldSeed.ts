type WorldSeedEntity =
    | {
          state?: Record<string, unknown>;
      }
    | null
    | undefined;

export const readWorldSeed = (
    entity: WorldSeedEntity,
    fallback: string,
): string => {
    const value = (entity?.state?.worldSeed as { value?: unknown } | undefined)
        ?.value;
    return typeof value === "string" && value.trim() ? value : fallback;
};

export const ensureWorldSeedState = (
    entity: Exclude<WorldSeedEntity, null | undefined>,
    seed: string,
): void => {
    entity.state ??= {};
    entity.state.worldSeed = {
        value: readWorldSeed(entity, seed),
        visible: false,
    };
};

export const withWorldSeed = (worldSeed: string, seed: string): string =>
    `${worldSeed}:${seed}`;
