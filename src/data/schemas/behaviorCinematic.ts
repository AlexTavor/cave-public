import { z } from "zod";

export const ShowCinematicActionSchema = z.object({
    type: z.literal("SHOW_CINEMATIC"),
    lines: z.array(z.string().trim().min(1)).min(1),
});

export type ShowCinematicAction = z.infer<typeof ShowCinematicActionSchema>;
