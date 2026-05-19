import type { HabitusEffect } from "../../data/schemas/game/habiti";

export const resolveHabitusEffectDescriptions = (effects: HabitusEffect[]) =>
    effects.flatMap((effect) =>
        effect.description ? [effect.description] : [],
    );
