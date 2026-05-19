const TOOLTIP_PREFIX = "tooltip:";

export function parseTooltip(description?: string): string | undefined {
    if (!description) return undefined;

    const pipeIndex = description.indexOf("|");
    if (pipeIndex === -1) {
        if (description.startsWith(TOOLTIP_PREFIX)) {
            return description.slice(TOOLTIP_PREFIX.length).trim();
        }
        return undefined;
    }

    const segment = description.slice(pipeIndex + 1);
    if (segment.startsWith(TOOLTIP_PREFIX)) {
        return segment.slice(TOOLTIP_PREFIX.length).trim();
    }

    return undefined;
}
