import type { BodyComponent, Passport } from "../../../data/schemas/game/body";
import type {
    BodySettings,
    HabitusDefinition,
} from "../../../data/schemas/game/habiti";
import { resolvePassportAvatarDisplayKey } from "../../../lib/body-identity/avatarDisplayKey";
import { bodyIdentityCatalog } from "../../../lib/body-identity/bodyIdentityCatalog";
import { generateBodyIdentity } from "../../../lib/body-identity/bodyIdentityGenerator";
import { assignBodyHabiti } from "../../../game/habiti/assignBodyHabiti";

const normalizePassport = (passport?: Passport): Passport => ({
    name: passport?.name ?? "Unknown",
    description: passport?.description,
    portraitIcon: passport?.portraitIcon,
    glyphKey: passport?.glyphKey,
    identitySerial: passport?.identitySerial,
    avatarDisplayKey: passport?.avatarDisplayKey,
});

export const resolveBodyIdentityBackfill = (
    body: BodyComponent,
    nextIdentitySerial: number,
    settings?: BodySettings,
    habitusIndex: Record<string, HabitusDefinition> = {},
    usedNames: Iterable<string> = [],
    worldSeed: string = "world",
): {
    passportPatch: Partial<Passport> | null;
    habitus: string[] | null;
    nextIdentitySerial: number;
} => {
    const passport = normalizePassport(body.passport);
    const reserved = passport.identitySerial ?? nextIdentitySerial + 1;
    const identitySerial = passport.identitySerial ?? reserved;
    const passportPatch: Partial<Passport> =
        passport.identitySerial == null ? { identitySerial } : {};
    if (!passport.avatarDisplayKey) {
        passportPatch.avatarDisplayKey =
            resolvePassportAvatarDisplayKey({ identitySerial }) ?? undefined;
    }
    const habitus = assignBodyHabiti({
        identitySerial,
        existingHabiti: body.habiti,
        settings,
        habitusIndex,
        worldSeed,
    });
    const generated = generateBodyIdentity(
        identitySerial,
        passport.name,
        habitus,
        habitusIndex,
        bodyIdentityCatalog,
        usedNames,
        worldSeed,
    );
    if (generated) Object.assign(passportPatch, generated);
    return {
        passportPatch:
            Object.keys(passportPatch).length > 0 ? passportPatch : null,
        habitus,
        nextIdentitySerial:
            passport.identitySerial == null ? reserved : nextIdentitySerial,
    };
};
