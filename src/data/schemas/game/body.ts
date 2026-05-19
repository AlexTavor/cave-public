import { z } from "zod";

export const AttributeSetSchema = z.object({
    body: z.number().min(0),
    mind: z.number().min(0),
    social: z.number().min(0),
});

export const PassportSchema = z.object({
    name: z.string().default("Unknown"),
    description: z.string().optional(),
    portraitIcon: z.string().describe("ui:icon").optional(),
    glyphKey: z.string().optional(),
    identitySerial: z.number().int().min(1).optional(),
    avatarDisplayKey: z.string().optional(),
});

export const BodyComponentSchema = z.object({
    xp: z.number().default(0),
    // Individual multiplier for XP gain (default 1)
    xpRate: z.number().default(1),
    level: z.number().int().min(1).default(1),

    // The canonical "base" stats, mutated only by leveling up
    baseAttributes: AttributeSetSchema.default({
        body: 1,
        mind: 1,
        social: 1,
    }),

    // The effective stats (base + trait modifiers), recomputed on change
    attributes: AttributeSetSchema.default({
        body: 1,
        mind: 1,
        social: 1,
    }),

    passport: PassportSchema.default({ name: "Unknown" }),
    traits: z.array(z.string()).default([]), // References Trait IDs
    habiti: z.array(z.string()).default([]),
    // Default to 100 to prevent instant death on load before first tick
    health: z.number().default(100),
    // Derived stat cached for UI and systems
    maxHealth: z.number().default(100),
    assignmentId: z.string().default("sys_world"),
    assignmentStatus: z.enum(["navigating", "orbiting"]).default("orbiting"),
});

export type AttributeSet = z.infer<typeof AttributeSetSchema>;

export type Passport = z.infer<typeof PassportSchema>;

export type BodyComponent = z.infer<typeof BodyComponentSchema>;

