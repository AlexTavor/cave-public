import type { DraftOptionBlueprint } from "../../../data/schemas/draft";

export interface DraftComponent {
    _tag: "draft";
    active: boolean;
    poolId: string;
    triggerEntityId: string;
    options: DraftOptionBlueprint[];
    sourceLabel: string;
    selectedOptionId?: string | null;
    pickedOneOffs: string[];
    shownCountsByPool: Record<string, number>;
    cycleNumber: number;
    currentText: string;
}

