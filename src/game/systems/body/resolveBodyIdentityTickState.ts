import type { BodyComponent } from "../../../data/schemas/game/body";
import type {
    BodySettings,
    HabitusDefinition,
} from "../../../data/schemas/game/habiti";
import { resolveBodyIdentityBackfill } from "./identityBackfill";

export const resolveBodyIdentityTickState = (input: {
    body: BodyComponent | undefined;
    nextBodySerial: number;
    bodySettings?: BodySettings;
    habitusIndex: Record<string, HabitusDefinition>;
    usedNames: Set<string>;
    worldSeed?: string;
}) => {
    if (!input.body) {
        return {
            passportPatch: null,
            habitusPatch: null,
            nextIdentitySerial: input.nextBodySerial,
        };
    }
    const identity = resolveBodyIdentityBackfill(
        input.body,
        input.nextBodySerial,
        input.bodySettings,
        input.habitusIndex,
        input.usedNames,
        input.worldSeed,
    );
    if (identity.passportPatch?.name)
        input.usedNames.add(identity.passportPatch.name);
    return {
        passportPatch: identity.passportPatch,
        habitusPatch: identity.habitus,
        nextIdentitySerial: identity.nextIdentitySerial,
    };
};
