import {
    CaveComponent,
    CaveProgression,
} from "../../../data/schemas/game/cave";
import { StateComponent } from "../../../data/schemas/components";

export const resolveCaveProgression = (
    entity: Readonly<Record<string, unknown>> | undefined,
): CaveProgression => {
    if (!entity) return { xp: 0, level: 1, skillpoints: 0 };
    const state = entity.state as StateComponent;
    const cave = entity.cave as CaveComponent;
    drainStateXp(cave, state);
    return {
        xp: cave.progression?.xp ?? 0,
        level: cave.progression?.level ?? 1,
        skillpoints: cave.progression?.skillpoints ?? 0,
    };
};

const drainStateXp = (cave: CaveComponent, state: StateComponent) => {
    if (!cave.progression || !state?.xp?.value) return;
    cave.progression.xp =
        (cave.progression.xp ?? 0) + ((state.xp.value as number) ?? 0);
    state.xp.value = 0;
};
