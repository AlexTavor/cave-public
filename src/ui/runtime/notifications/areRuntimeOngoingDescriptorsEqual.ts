import type { RuntimeOngoingDescriptor } from "./runtimeNotificationTypes";

const itemEquals = (
    left: RuntimeOngoingDescriptor,
    right: RuntimeOngoingDescriptor,
) => {
    if (
        left.key !== right.key ||
        left.kind !== right.kind ||
        left.guidanceId !== right.guidanceId ||
        left.priority !== right.priority
    ) {
        return false;
    }
    if (left.kind === "suspicion" && right.kind === "suspicion") {
        return (
            left.levelText === right.levelText &&
            left.levelColor === right.levelColor
        );
    }
    if ("count" in left || "count" in right)
        return (left as { count?: number }).count === (right as { count?: number }).count;
    return true;
};

export const areRuntimeOngoingDescriptorsEqual = (
    left: RuntimeOngoingDescriptor[],
    right: RuntimeOngoingDescriptor[],
) =>
    left.length === right.length &&
    left.every((item, index) => itemEquals(item, right[index]));