export interface SliderMeta {
    min: number;
    max: number;
    step: number;
}

const DEFAULT_SLIDER: SliderMeta = {
    min: 0,
    max: 100,
    step: 1,
};

export function parseSliderMeta(description?: string): SliderMeta | null {
    if (!description?.includes("ui:slider")) return null;

    const segments = description.split(";");
    const meta: SliderMeta = { ...DEFAULT_SLIDER };

    for (const segment of segments) {
        const [rawKey, rawValue] = segment.split("=");
        const key = rawKey?.trim();
        const value = rawValue?.trim();
        if (!key || value === undefined) continue;

        const parsed = Number.parseFloat(value);
        if (Number.isNaN(parsed)) continue;

        if (key === "min") meta.min = parsed;
        if (key === "max") meta.max = parsed;
        if (key === "step") meta.step = parsed;
    }

    return meta;
}
