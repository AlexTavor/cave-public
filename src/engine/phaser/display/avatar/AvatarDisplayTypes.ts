export type AvatarRole = "neutral" | "body" | "mind" | "social";

export type NormalizedPathPoint = Readonly<{ x: number; y: number }>;
export type NormalizedShapePath = readonly NormalizedPathPoint[];

export type AvatarCatalogRecord = Readonly<{
    id: string;
    path: NormalizedShapePath;
}>;

export type AvatarAppearance = Readonly<{
    appearanceKey: string;
    faceShapeIndex: number;
    hairShapeIndex: number;
    eyeShapeIndex: number;
    eyeOffsetY: number;
    eyeSpacing: number;
    eyeScaleX: number;
    eyeScaleY: number;
    blinkIntervalMs: number;
    blinkDurationMs: number;
    blinkPhaseMs: number;
}>;

export type SwarmAvatarPlacement = Readonly<{
    x: number;
    y: number;
    memberScale: number;
}>;
