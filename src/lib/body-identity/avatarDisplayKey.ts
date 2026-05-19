import type { Passport } from "../../data/schemas/game/body";

const AVATAR_KEY_PREFIX = "body_avatar:";

const readSerial = (value: unknown): number | null => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return value > 0 ? Math.floor(value) : null;
};

export const buildBodyAvatarDisplayKey = (identitySerial: number): string =>
    `${AVATAR_KEY_PREFIX}${identitySerial}`;

export const resolvePassportAvatarDisplayKey = (
    passport?: Pick<Passport, "avatarDisplayKey" | "identitySerial"> | null,
): string | null => {
    const authoredKey = passport?.avatarDisplayKey?.trim();
    if (authoredKey) return authoredKey;
    const identitySerial = readSerial(passport?.identitySerial);
    return identitySerial ? buildBodyAvatarDisplayKey(identitySerial) : null;
};
