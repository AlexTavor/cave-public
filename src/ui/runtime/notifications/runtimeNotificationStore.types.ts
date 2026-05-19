import type {
    RuntimeEventInput,
    RuntimeEventItem,
} from "./runtimeNotificationTypes";

export type RuntimeNotificationState = {
    eventItems: RuntimeEventItem[];
    applyEventBatch: (batch: RuntimeEventInput[], nowMs?: number) => void;
    dismissEvent: (aggregationKey: string) => void;
    reset: () => void;
};
