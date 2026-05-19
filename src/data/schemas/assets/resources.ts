import { z } from "zod";
import { TransferVisualSchema } from "./resourceTransferVisual";

export {
    TransferBlendModeSchema,
    TransferLightVisualSchema,
    TransferParticlesVisualSchema,
    TransferShapeSchema,
    TransferVisualSchema,
    type TransferBlendMode,
    type TransferLightVisual,
    type TransferParticlesVisual,
    type TransferShape,
    type TransferVisual,
} from "./resourceTransferVisual";

export const ResourceLegacyVisualSchema = z.object({
    color: z.string(),
    radius: z.number().default(4),
    effect: z.enum(["solid", "liquid", "glow"]).default("solid"),
});

export const ResourceVisualSchema = ResourceLegacyVisualSchema.extend({
    transferVisual: TransferVisualSchema.optional(),
});

export type ResourceLegacyVisual = z.infer<typeof ResourceLegacyVisualSchema>;
export type ResourceVisual = z.infer<typeof ResourceVisualSchema>;

