export type RuntimeCalloutKind = "habitus_gained" | "absorption_batch_complete";

export type RuntimeCalloutInput = {
    kind: RuntimeCalloutKind;
    aggregationKey: string;
    count: number;
    text: string;
    targetEntityId: string | null;
    slot: "top" | "top_left" | "top_right" | "center";
};

export type RuntimeCalloutItem = RuntimeCalloutInput & {
    id: string;
    expiresAtMs: number;
    updatedAtMs: number;
};
