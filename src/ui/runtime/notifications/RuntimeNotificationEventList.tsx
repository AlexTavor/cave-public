import type React from "react";
import {
    Animatable,
    AnimatePresence,
} from "../../lib/atoms/animatable/Animatable";
import { useWorldInteraction } from "../world/context/WorldInteractionContext";
import { formatRuntimeEventText } from "./formatRuntimeNotificationText";
import { handleRuntimeEventClick } from "./handleRuntimeEventClick";
import { RuntimeNotificationCard } from "./RuntimeNotificationCard";
import { EventNotificationBlock } from "./RuntimeNotificationViewport.styles";
import {
    selectEventItems,
    useRuntimeNotificationStore,
} from "./runtimeNotificationStore";

export function RuntimeNotificationEventList(): React.JSX.Element {
    const world = useWorldInteraction();
    const items = useRuntimeNotificationStore(selectEventItems);
    return (
        <EventNotificationBlock aria-label="Event runtime notifications">
            <AnimatePresence initial={false}>
                {items.map((item) => (
                    <Animatable key={item.id} type="slideDown">
                        <RuntimeNotificationCard
                            clickable={true}
                            display={formatRuntimeEventText(item)}
                            onClick={() => handleRuntimeEventClick(item, world)}
                        />
                    </Animatable>
                ))}
            </AnimatePresence>
        </EventNotificationBlock>
    );
}
