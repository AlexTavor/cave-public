import type { ResolvedNodeOverlayModel } from "./nodeOverlayTypes";

const HIDDEN_ASSIGNMENT_LABELS = new Set(["Idle"]);
const HIDDEN_CYCLE_VALUES = new Set(["Idle", "No power"]);

export const filterVisibleNodeOverlayModels = (
    models: ResolvedNodeOverlayModel[],
) =>
    models.filter((model) => {
        if (model.kind === "assignment") {
            return !HIDDEN_ASSIGNMENT_LABELS.has(model.label);
        }
        if (model.kind === "cycle") {
            if ("valueBinding" in model || typeof model.valueText !== "string")
                return true;
            return !HIDDEN_CYCLE_VALUES.has(model.valueText);
        }
        return true;
    });
