export type BehaviorKind = "behavior";

export interface BehaviorSource {
    ruleId: string;
}

export interface BehaviorItem {
    id: string;
    kind: BehaviorKind;
    sentence: string;
    sortKey: string;
    source: BehaviorSource;
}
