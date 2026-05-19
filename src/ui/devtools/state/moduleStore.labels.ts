import type { BlueprintHeader } from "../../../engine/registry/types";

export function normalizeLabel(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export function makeLabelIndex(
    headers: Record<string, BlueprintHeader>
): Record<string, string> {
    const labelToId: Record<string, string> = {};

    for (const [id, header] of Object.entries(headers)) {
        const key = header.label.trim().toLowerCase();
        if (!key) continue;
        // First write wins; collisions are handled by validation.
        if (!labelToId[key]) labelToId[key] = id;
    }

    return labelToId;
}

export function suggestUniqueLabelForIndex(
    baseLabel: string,
    labelToId: Record<string, string>
): string {
    const clean = baseLabel.trim() || "New Entity";
    const key = clean.toLowerCase();
    if (!labelToId[key]) return clean;

    const copy1 = `${clean} (Copy)`;
    if (!labelToId[copy1.toLowerCase()]) return copy1;

    for (let i = 2; i < 9999; i++) {
        const candidate = `${clean} (Copy ${i})`;
        if (!labelToId[candidate.toLowerCase()]) return candidate;
    }

    // Fallback: very unlikely.
    return `${clean} (${Date.now()})`;
}

export function validateUniqueLabelForIndex(params: {
    labelToId: Record<string, string>;
    label: string;
    currentId?: string;
}): { ok: boolean; existingId?: string } {
    const key = normalizeLabel(params.label).toLowerCase();
    if (!key) return { ok: true };

    const existingId = params.labelToId[key];
    if (!existingId) return { ok: true };

    if (params.currentId && existingId === params.currentId) {
        return { ok: true };
    }

    return { ok: false, existingId };
}
