export type BlueprintId = string;

export interface BlueprintHeader {
    id: BlueprintId;
    label: string;
}

export interface IncomingReference {
    targetId: BlueprintId;
    fromId: BlueprintId;
    fromLabel: string;
    path: string;
    value: string;
}

export interface BrokenReference {
    missingId: string;
    fromId: BlueprintId;
    fromLabel: string;
    path: string;
    value: string;
}

export interface ReferenceIndex {
    incomingByTarget: Record<BlueprintId, IncomingReference[]>;
    broken: BrokenReference[];
}
