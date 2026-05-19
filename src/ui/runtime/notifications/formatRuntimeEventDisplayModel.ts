import type {
    RuntimeEventDisplayModel,
    RuntimeEventItem,
} from "./runtimeNotificationTypes";

const bodyLabel = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`;

export const formatRuntimeEventDisplayModel = (
    item: RuntimeEventItem,
): RuntimeEventDisplayModel => {
    switch (item.kind) {
        case "body_added":
            return {
                text: bodyLabel(item.count, "new body", "new bodies"),
                tone: "info",
            };
        case "body_died":
            return {
                text: bodyLabel(item.count, "body died", "bodies died"),
                tone: "danger",
            };
        case "body_starved":
            return {
                text: bodyLabel(item.count, "body starved", "bodies starved"),
                tone: "warning",
            };
        case "body_purge_kill":
            return {
                text: bodyLabel(
                    item.count,
                    "body killed by Purge",
                    "bodies killed by Purge",
                ),
                tone: "danger",
            };
        case "body_butchered":
            return {
                text: bodyLabel(
                    item.count,
                    "body butchered",
                    "bodies butchered",
                ),
                tone: "warning",
            };
        case "body_absorbed":
            return {
                text: bodyLabel(item.count, "body absorbed", "bodies absorbed"),
                tone: "info",
            };
        case "body_level_up":
            return {
                text: bodyLabel(
                    item.count,
                    `body reached level ${item.level}`,
                    `bodies reached level ${item.level}`,
                ),
                tone: "info",
            };
        case "entity_discovered": {
            const suffix = item.count > 1 ? ` (x${item.count})` : "";
            return {
                text: `${item.entityLabel ?? "Unknown"} discovered${suffix}`,
                tone: "default",
            };
        }
        case "entity_unlocked": {
            const suffix = item.count > 1 ? ` (x${item.count})` : "";
            return {
                text: `${item.entityLabel ?? "Unknown"} unlocked${suffix}`,
                tone: "default",
            };
        }
        case "purge_milestone":
            return {
                text: item.entityLabel ?? "A Purge milestone was reached",
                tone: "purge",
            };
    }
};
