import type { Passport } from "../../data/schemas/game/body";
import type { HabitusDefinition } from "../../data/schemas/game/habiti";
import type { BodyIdentityCatalog } from "./bodyIdentityCatalog";
import { pseudoRandom } from "../../utils/pseudoRandom";
import { withWorldSeed } from "../../utils/worldSeed";

const isPlaceholderName = (name?: string): boolean => {
    const normalized = name?.trim();
    return !normalized || normalized === "Unknown";
};

const gcd = (left: number, right: number): number => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b) {
        [a, b] = [b, a % b];
    }
    return a || 1;
};

const resolveStep = (
    total: number,
    salt: string,
    worldSeed: string,
): number => {
    let step = Math.max(
        1,
        Math.floor(
            pseudoRandom(withWorldSeed(worldSeed, `body-step:${salt}`)) * total,
        ),
    );
    while (gcd(step, total) !== 1) step += 1;
    return step;
};

const readIdentitySalt = (
    assignedHabiti: string[],
    habitusIndex: Record<string, HabitusDefinition>,
) =>
    assignedHabiti
        .filter((id) => habitusIndex[id]?.type !== "unique_body")
        .sort((left, right) => left.localeCompare(right))
        .join("|") || "none";

const buildCandidate = (
    identitySerial: number,
    salt: string,
    catalog: BodyIdentityCatalog,
    attempt: number,
    worldSeed: string,
): Partial<Passport> => {
    const firstNameCount = catalog.givenNames.length;
    const familyCount =
        catalog.familyRoots.length * catalog.familySuffixes.length;
    const total = Math.max(1, firstNameCount * familyCount);
    const offset = Math.floor(
        pseudoRandom(withWorldSeed(worldSeed, `body-offset:${salt}`)) * total,
    );
    const index =
        (offset +
            (identitySerial - 1 + attempt) *
                resolveStep(total, salt, worldSeed)) %
        total;
    const firstIndex = index % firstNameCount;
    const familyIndex = Math.floor(index / firstNameCount);
    const givenName = catalog.givenNames[firstIndex];
    const familyRoot =
        catalog.familyRoots[familyIndex % catalog.familyRoots.length];
    const familySuffix =
        catalog.familySuffixes[
            Math.floor(familyIndex / catalog.familyRoots.length) %
                catalog.familySuffixes.length
        ];
    return { name: `${givenName} ${familyRoot}${familySuffix}` };
};

export const generateBodyIdentity = (
    identitySerial: number,
    name: Passport["name"] | undefined,
    assignedHabiti: string[],
    habitusIndex: Record<string, HabitusDefinition>,
    catalog: BodyIdentityCatalog,
    usedNames: Iterable<string> = [],
    worldSeed: string = "world",
): Partial<Passport> | null => {
    if (!isPlaceholderName(name)) return null;
    const salt = readIdentitySalt(assignedHabiti, habitusIndex);
    const reserved = new Set(Array.from(usedNames));
    const total = Math.max(
        1,
        catalog.givenNames.length *
            catalog.familyRoots.length *
            catalog.familySuffixes.length,
    );
    for (let attempt = 0; attempt < total; attempt += 1) {
        const candidate = buildCandidate(
            identitySerial,
            salt,
            catalog,
            attempt,
            worldSeed,
        );
        if (!reserved.has(candidate.name ?? "")) return candidate;
    }
    return buildCandidate(identitySerial, salt, catalog, 0, worldSeed);
};
