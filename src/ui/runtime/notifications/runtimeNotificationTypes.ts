import type { RuntimeOngoingKey } from "./runtimeOngoingGuidanceMap";

export type RuntimeEventKind =
    | "body_added"
    | "body_died"
    | "body_starved"
    | "body_purge_kill"
    | "body_butchered"
    | "body_absorbed"
    | "body_level_up"
    | "entity_discovered"
    | "entity_unlocked"
    | "purge_milestone";

export type RuntimeOngoingKind =
    | "purge_active"
    | "hungry_bodies"
    | "cold_bodies"
    | "suspicion";

export type RuntimeNotificationColorKey =
    | "statusKeywordHungry"
    | "statusKeywordCold";

export type RuntimeNotificationTextPart = {
    text: string;
    colorKey?: RuntimeNotificationColorKey;
    color?: string;
};

export type RuntimeNotificationTone =
    | "default"
    | "info"
    | "warning"
    | "danger"
    | "purge";

export type RuntimeEventInput = {
    kind: RuntimeEventKind;
    aggregationKey: string;
    count: number;
    level?: number;
    entityId?: string;
    entityLabel?: string;
};

export type RuntimeEventItem = RuntimeEventInput & {
    id: string;
    updatedAtMs: number;
    expiresAtMs: number;
};

type RuntimeOngoingBase<K extends RuntimeOngoingKind> = {
    key: RuntimeOngoingKey;
    kind: K;
    guidanceId: string;
    priority: number;
};

export type RuntimeOngoingDescriptor =
    | RuntimeOngoingBase<"purge_active">
    | (RuntimeOngoingBase<"hungry_bodies"> & { count: number })
    | (RuntimeOngoingBase<"cold_bodies"> & { count: number })
    | (RuntimeOngoingBase<"suspicion"> & {
          levelText: string;
          levelColor: string;
      });

export type RuntimeEventDisplayModel = {
    text: string;
    tone: RuntimeNotificationTone;
};

export type RuntimeOngoingDisplayModel = {
    parts: RuntimeNotificationTextPart[];
    tone: RuntimeNotificationTone;
};
