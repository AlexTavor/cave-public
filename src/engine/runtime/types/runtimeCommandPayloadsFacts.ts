import type { FactScope, FactType } from "../../../data/schemas/conditions";

export interface AdjustFactCommandPayload {
    scope: FactScope;
    factType: FactType;
    factAbout: string;
    delta: number;
}
