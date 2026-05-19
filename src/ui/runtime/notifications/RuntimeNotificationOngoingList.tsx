import React from "react";
import {
    Animatable,
    AnimatePresence,
} from "../../lib/atoms/animatable/Animatable";
import { useWorldInteraction } from "../world/context/WorldInteractionContext";
import { formatOngoingRuntimeNotificationText } from "./formatRuntimeNotificationText";
import { handleRuntimeOngoingClick } from "./handleRuntimeOngoingClick";
import { RuntimeNotificationCard } from "./RuntimeNotificationCard";
import { OngoingNotificationBlock } from "./RuntimeNotificationViewport.styles";
import { useRuntimeOngoingNotifications } from "./useRuntimeOngoingNotifications";

export const RuntimeNotificationOngoingList: React.FC = () => {
    const { runtime } = useWorldInteraction();
    const items = useRuntimeOngoingNotifications();
    return (
        <OngoingNotificationBlock aria-label="Ongoing runtime notifications">
            <AnimatePresence initial={false}>
                {items.map((item) => (
                    <Animatable key={item.key} type="slideUp">
                        <RuntimeNotificationCard
                            attention={false}
                            clickable={true}
                            display={formatOngoingRuntimeNotificationText(item)}
                            onClick={() =>
                                handleRuntimeOngoingClick(item, runtime)
                            }
                        />
                    </Animatable>
                ))}
            </AnimatePresence>
        </OngoingNotificationBlock>
    );
};
