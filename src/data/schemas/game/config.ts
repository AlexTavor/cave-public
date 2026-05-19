import { z } from "zod";
import {
    WorldConfigSchema,
    CameraConfigSchema,
    DEFAULT_WORLD_CONFIG,
    DEFAULT_CAMERA_CONFIG,
} from "./cameraWorldConfig";
import {
    CaveDisplayConfigSchema,
    DEFAULT_CAVE_DISPLAY_CONFIG,
} from "./caveDisplay";
import {
    SusDisplaySchema,
    SuspicionNotificationDisplaySchema,
} from "./susDisplay";

export const PurgeKillIntervalSchema = z.object({
    min: z
        .number()
        .default(5)
        .describe("tooltip:Minimum seconds between kills during a Purge"),
    max: z
        .number()
        .default(10)
        .describe("tooltip:Maximum seconds between kills during a Purge"),
});

export const PurgeMilestoneSchema = z.object({
    id: z.string().describe("tooltip:Unique identifier for this milestone."),
    threshold: z
        .number()
        .min(0)
        .max(1)
        .describe(
            "tooltip:The fraction of total purge progress required to trigger this narrative event.",
        ),
    messages: z
        .array(z.string())
        .default([])
        .describe(
            "tooltip:A pool of messages. One will be randomly selected when the threshold is reached.",
        ),
});

export const PurgeConfigSchema = z.object({
    maxProgress: z
        .number()
        .default(100)
        .describe(
            "tooltip:Amount of Purge Progress required to trigger a Purge",
        ),
    killIntervalSeconds: PurgeKillIntervalSchema.default({
        min: 5,
        max: 10,
    }),
    milestones: z.array(PurgeMilestoneSchema).default([]),
});

export const MenuAmbientConfigSchema = z.object({
    entityCount: z.number().int().min(1).default(72),
    minSpeedPxPerSecond: z.number().min(0).default(5),
    maxSpeedPxPerSecond: z.number().min(0).default(300),
    speedCurve: z.enum(["linear", "inExpo", "outExpo"]).default("inExpo"),
    retargetIntervalMsMin: z.number().min(1).default(1800),
    retargetIntervalMsMax: z.number().min(1).default(5200),
});

const DEFAULT_MENU_AMBIENT_CONFIG = {
    entityCount: 72,
    minSpeedPxPerSecond: 5,
    maxSpeedPxPerSecond: 300,
    speedCurve: "inExpo" as const,
    retargetIntervalMsMin: 1800,
    retargetIntervalMsMax: 5200,
};

export const GameConfigSchema = z
    .object({
        purge: PurgeConfigSchema.default({
            maxProgress: 100,
            killIntervalSeconds: { min: 5, max: 10 },
            milestones: [],
        }),
        susDisplays: z.array(SusDisplaySchema).default([]),
        suspicionNotificationDisplays: z
            .array(SuspicionNotificationDisplaySchema)
            .default([]),
        caveDisplay: CaveDisplayConfigSchema.default(
            DEFAULT_CAVE_DISPLAY_CONFIG,
        ),
        world: WorldConfigSchema.default(DEFAULT_WORLD_CONFIG),
        camera: CameraConfigSchema.default(DEFAULT_CAMERA_CONFIG),
        menuAmbient: MenuAmbientConfigSchema.default(
            DEFAULT_MENU_AMBIENT_CONFIG,
        ),
    })
    .catchall(z.unknown());

export const DEFAULT_GAME_CONFIG = GameConfigSchema.parse({});

export type PurgeMilestone = z.infer<typeof PurgeMilestoneSchema>;
export type PurgeConfig = z.infer<typeof PurgeConfigSchema>;
export type MenuAmbientConfig = z.infer<typeof MenuAmbientConfigSchema>;
export type GameConfig = z.infer<typeof GameConfigSchema>;

