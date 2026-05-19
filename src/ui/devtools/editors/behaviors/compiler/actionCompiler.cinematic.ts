import type { ShowCinematicAction } from "../../../../../data/schemas/behaviorCinematic";

export const parseShowCinematicAction = (
    segment: string,
): ShowCinematicAction => {
    const input = segment.trim();
    const rest = input.replace(/^SHOW_CINEMATIC\b/i, "").trim();
    if (!rest) throw new Error("SHOW_CINEMATIC requires at least one line.");

    try {
        const lines = JSON.parse(`[${rest}]`) as unknown;
        if (!Array.isArray(lines) || lines.length === 0) {
            throw new Error("SHOW_CINEMATIC requires at least one line.");
        }
        if (
            lines.some((line) => typeof line !== "string" || line.trim() === "")
        ) {
            throw new Error(
                "SHOW_CINEMATIC lines must be quoted non-empty strings.",
            );
        }
        return { type: "SHOW_CINEMATIC", lines };
    } catch (error) {
        if (
            error instanceof Error &&
            error.message.includes("SHOW_CINEMATIC")
        ) {
            throw error;
        }
        throw new Error(
            "SHOW_CINEMATIC must use comma-separated quoted lines.",
        );
    }
};
