import { z } from "zod";

export const DEFAULT_VEIN_HEARTBEAT = {
    bpm: 60,
    envelope: [
        { t: 0, v: 0 },
        { t: 0.1, v: 1 },
        { t: 0.4, v: 0 },
    ],
};

export const VeinHeartbeatSchema = z.object({
    bpm: z.number().default(DEFAULT_VEIN_HEARTBEAT.bpm),
    envelope: z
        .array(
            z.object({
                t: z.number().min(0).max(1),
                v: z.number().min(0).max(1),
            }),
        )
        .default(DEFAULT_VEIN_HEARTBEAT.envelope),
});
