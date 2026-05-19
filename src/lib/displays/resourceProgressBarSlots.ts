export const RESOURCE_PROGRESS_BAR_POSITIONS = [
    "top_left",
    "top_right",
    "bottom_left",
    "bottom_right",
] as const;

export type ResourceProgressBarPosition =
    (typeof RESOURCE_PROGRESS_BAR_POSITIONS)[number];

export const DEFAULT_RESOURCE_PROGRESS_BAR_SPAN_RATIO = 0.5;

export const RESOURCE_PROGRESS_BAR_POSITION_LABELS: Record<
    ResourceProgressBarPosition,
    string
> = {
    top_left: "Top Left",
    top_right: "Top Right",
    bottom_left: "Bottom Left",
    bottom_right: "Bottom Right",
};
