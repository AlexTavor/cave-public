import type { Runtime } from "../../../engine/runtime/Runtime";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { RuntimeOngoingDescriptor } from "./runtimeNotificationTypes";

type ModalGuidance = {
    id: string;
    presentation: "modal";
    title: string;
    text: string;
    imageUrl: string | null;
};

const isModalGuidance = (value: unknown): value is ModalGuidance => {
    const guidance = value as ModalGuidance | null;
    return (
        !!guidance &&
        guidance.presentation === "modal" &&
        typeof guidance.title === "string" &&
        guidance.title.trim().length > 0 &&
        typeof guidance.text === "string" &&
        guidance.text.trim().length > 0 &&
        (typeof guidance.imageUrl === "string" || guidance.imageUrl === null)
    );
};

export const handleRuntimeOngoingClick = (
    item: RuntimeOngoingDescriptor,
    runtime: Runtime | null,
) => {
    if (!runtime)
        return console.error("Missing runtime for ongoing notification click.");
    if (!item.guidanceId)
        return console.error("Missing guidance id for ongoing notification.");
    const guidances = runtime.getCartridge().config?.settings?.guidances ?? [];
    const guidance = guidances.find((entry) => entry.id === item.guidanceId);
    if (!guidance)
        return console.error(`Missing authored guidance '${item.guidanceId}'.`);
    if (!isModalGuidance(guidance)) {
        return console.error(
            `Guidance '${item.guidanceId}' must be a valid modal guidance.`,
        );
    }
    runtime.commands.enqueue({
        type: RuntimeCommandType.SHOW_NOTIFICATION_ABILITY_GUIDANCE,
        payload: {
            abilityId: guidance.id,
            title: guidance.title,
            text: guidance.text,
            imageUrl: guidance.imageUrl,
        },
    });
    if (runtime.getState().status === "paused") runtime.flushCommands();
};
