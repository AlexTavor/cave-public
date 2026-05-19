import type {
    RuntimeOngoingDescriptor,
    RuntimeOngoingDisplayModel,
} from "./runtimeNotificationTypes";
export { formatRuntimeEventDisplayModel as formatRuntimeEventText } from "./formatRuntimeEventDisplayModel";

const ongoingPrefix = (count: number) =>
    count === 1 ? "1 body is" : `${count} bodies are`;

export const formatOngoingRuntimeNotificationText = (
    item: RuntimeOngoingDescriptor,
): RuntimeOngoingDisplayModel => {
    switch (item.kind) {
        case "hungry_bodies":
            return {
                parts: [
                    { text: ongoingPrefix(item.count ?? 0) },
                    { text: "hungry", colorKey: "statusKeywordHungry" },
                ],
                tone: "warning",
            };
        case "cold_bodies":
            return {
                parts: [
                    { text: ongoingPrefix(item.count ?? 0) },
                    { text: "cold", colorKey: "statusKeywordCold" },
                ],
                tone: "info",
            };
        case "purge_active":
            return { parts: [{ text: "The Purge is on" }], tone: "purge" };
        case "suspicion":
            return {
                parts: [
                    { text: "Suspicion:" },
                    { text: item.levelText, color: item.levelColor },
                ],
                tone: "default",
            };
    }
};
