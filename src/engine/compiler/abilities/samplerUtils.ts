const sanitizeSegment = (value: string): string => value.replaceAll(/\W/g, "_");

export const deriveSamplerTargetKey = (source: string): string | null => {
    const trimmed = source.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(".").filter(Boolean);
    if (parts.length === 0) return null;

    let candidate = parts.at(-1) ?? "";
    if (candidate === "value" || candidate === "max") {
        candidate = parts.at(-2) ?? "";
    }

    const sanitized = sanitizeSegment(candidate);
    if (!sanitized) return null;
    return `sampled_${sanitized}`;
};
