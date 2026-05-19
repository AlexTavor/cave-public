export type BodyAvatarPresentation = {
    appearanceKey: string;
    glowSrc: string;
    silhouetteSrc: string;
    eyesSrc: string;
};

type BodyAvatarResolver = (subjectId: string) => BodyAvatarPresentation | null;

let activeResolver: BodyAvatarResolver | null = null;

export const registerBodyAvatarResolver = (
    resolver: BodyAvatarResolver,
): void => {
    activeResolver = resolver;
};

export const clearBodyAvatarResolver = (): void => {
    activeResolver = null;
};

export const resolveBodyAvatarPresentation = (
    subjectId: string,
): BodyAvatarPresentation | null => activeResolver?.(subjectId) ?? null;
