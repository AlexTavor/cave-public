import { z } from "zod";
import { DEFAULT_WORLD_BOUNDS } from "./defaultWorldBounds";

export const WorldConfigSchema = z
    .object({
        width: z
            .number()
            .default(DEFAULT_WORLD_BOUNDS.width)
            .describe("tooltip:World width in world units."),
        height: z
            .number()
            .default(DEFAULT_WORLD_BOUNDS.height)
            .describe("tooltip:World height in world units."),
    })
    .describe("tooltip:Defines the finite world dimensions.");

export const CameraZoomSchema = z
    .object({
        min: z
            .number()
            .default(0.1)
            .describe("tooltip:Minimum allowed zoom level."),
        max: z
            .number()
            .default(4)
            .describe("tooltip:Maximum allowed zoom level."),
        start: z
            .number()
            .default(1)
            .describe("tooltip:Initial zoom level on fresh start."),
        scrollFactor: z
            .number()
            .default(0.2)
            .describe("tooltip:Zoom change per scroll wheel step."),
    })
    .describe("tooltip:Camera zoom constraints and behavior.");

export const CameraPanSchema = z
    .object({
        damping: z
            .number()
            .default(0.1)
            .describe("tooltip:Inertia damping factor for camera pan."),
        focusLerpMs: z
            .number()
            .min(0)
            .default(500)
            .describe(
                "tooltip:Milliseconds used to lerp programmatic camera focus moves.",
            ),
        boundsPadding: z
            .number()
            .default(1000)
            .describe("tooltip:Extra padding inside world bounds for camera."),
        dragThreshold: z
            .number()
            .default(5)
            .describe(
                "tooltip:Minimum pixel travel to classify pointer as drag.",
            ),
    })
    .describe("tooltip:Camera panning behavior and drag settings.");

export const CameraConfigSchema = z
    .object({
        zoom: CameraZoomSchema.default({
            min: 0.1,
            max: 4,
            start: 1,
            scrollFactor: 0.2,
        }),
        pan: CameraPanSchema.default({
            damping: 0.1,
            focusLerpMs: 500,
            boundsPadding: 1000,
            dragThreshold: 5,
        }),
    })
    .describe("tooltip:Camera tuning for zoom and pan behavior.");

export const CameraWorldEditorSchema = z
    .object({
        world: WorldConfigSchema.default(DEFAULT_WORLD_BOUNDS),
        camera: CameraConfigSchema.default({
            zoom: {
                min: 0.1,
                max: 4,
                start: 1,
                scrollFactor: 0.2,
            },
            pan: {
                damping: 0.1,
                focusLerpMs: 500,
                boundsPadding: 1000,
                dragThreshold: 5,
            },
        }),
    })
    .catchall(z.unknown())
    .describe("tooltip:Camera + World settings.");

export const DEFAULT_WORLD_CONFIG = WorldConfigSchema.parse({});
export const DEFAULT_CAMERA_CONFIG = CameraConfigSchema.parse({});

export type WorldConfig = z.infer<typeof WorldConfigSchema>;
export type CameraConfig = z.infer<typeof CameraConfigSchema>;
export type CameraZoomConfig = z.infer<typeof CameraZoomSchema>;
export type CameraPanConfig = z.infer<typeof CameraPanSchema>;

