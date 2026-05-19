export type BaseAttributes = { body: number; mind: number; social: number };

export type Passport = {
    name: string;
    description: string;
    portraitIcon: string;
};

export const clampAttribute = (value: number, min = 0, max = 999): number =>
    Math.min(max, Math.max(min, value));

export const normalizeBaseAttributes = (raw: unknown): BaseAttributes => {
    const attrs = (raw as Record<string, unknown>) ?? {};
    return {
        body: Number(attrs.body ?? 1),
        mind: Number(attrs.mind ?? 1),
        social: Number(attrs.social ?? 1),
    };
};

export const normalizePassport = (raw: unknown): Passport => {
    const passport = (raw as Record<string, unknown>) ?? {};
    const name = typeof passport.name === "string" ? passport.name : "";
    const description =
        typeof passport.description === "string" ? passport.description : "";
    const portraitIcon =
        typeof passport.portraitIcon === "string" ? passport.portraitIcon : "";
    return {
        name,
        description,
        portraitIcon,
    };
};

export const parseTraitsInput = (value: string): string[] =>
    value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

export const stringifyTraits = (traits: string[] | undefined): string =>
    (traits ?? []).join(", ");
