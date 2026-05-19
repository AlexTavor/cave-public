export const cycleToggleFields = [
    {
        label: "One-Off",
        path: "oneOff",
        tooltip:
            "If enabled, the cycle runs once. The entity destroys itself when all storage is empty.",
    },
    {
        label: "Show Progress Bar",
        path: "showProgressBar",
        tooltip:
            "If enabled, shows cycle progress as one of the entity's bars.",
    },
    {
        label: "Show Throttle Slider",
        path: "showThrottleSlider",
        tooltip:
            "If enabled, the runtime job card shows the throttle slider for this cycle.",
    },
    {
        label: "Start Active",
        path: "startActive",
        tooltip:
            "If enabled, the throttle starts at 1 (on). Otherwise starts at 0 (off).",
    },
] as const;
