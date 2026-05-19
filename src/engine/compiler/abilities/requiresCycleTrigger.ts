export const requiresCycleTrigger = (triggers: string[] | undefined): boolean =>
    (triggers ?? ["cycle_complete"]).includes("cycle_complete");
